import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  ApiError,
  type Content,
  type FunctionCall,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { createServerSupabase } from "@/lib/supabase/server";
import { getChatUsage, consumeChatUsage } from "@/lib/portfolio-chat/usage";
import { buildPortfolioSummary } from "@/lib/portfolio-chat/context";
import { KNOWLEDGE_BASE } from "@/lib/portfolio-chat/knowledge";
import { FUNCTION_DECLARATIONS, TOOL } from "@/lib/portfolio-chat/tools";
import { getFieldDef, validateFieldValue, readFieldValue } from "@/lib/portfolio-chat/fields";
import { answerFromPropertyDocuments } from "@/lib/portfolio-chat/documents";
import type { Property, PropertyInputs } from "@/lib/supabase/types";
import type { ChatRequest, ChatStreamEvent } from "@/features/portfolio-chat/types";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Safety bound on the tool-calling loop so a misbehaving model can't spin.
const MAX_TURNS = 6;

function systemPrompt(summary: string, viewingLine: string): string {
  return `You are the portfolio assistant inside immotrim, a German real-estate analysis app. You help the user understand and adjust their property portfolio.

Answer in the user's language (default German). Be concise and concrete; use the numbers from the portfolio data. Units: monetary values are in euros, rates (zins, tilgung, afaPct, steuersatz, leerstand, growth) are percentages as plain numbers, zinsbindung is in years, rents/costs are monthly euros.

Each property has raw \`inputs\` AND a precomputed \`metrics\` block; the portfolio totals have one too. These metrics are AUTHORITATIVE — they are computed by the app with the same logic as its charts/KPIs. ALWAYS use them directly. NEVER recompute, project, or estimate financial figures yourself; doing so produces wrong, inconsistent numbers. If a figure the user wants is not present in inputs or metrics, say so plainly instead of guessing.

Use the following knowledge base to interpret terms, explain KPIs/charts, and reason about scenarios:
${KNOWLEDGE_BASE}

You can:
- Answer questions about the portfolio using the data below.
- Call readPropertyDocuments(propertyId, question) when a question needs the contents of a property's uploaded documents.
- When the user asks to change a value, call proposePropertyFieldChange. This does NOT apply the change; it shows the user a confirmation card and the change is only saved if they accept. Never claim a change is done — say you have proposed it for confirmation. Propose only one field per message.
${viewingLine}
Current portfolio:
${summary}`;
}

function sse(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

// gemini-2.5-flash can return 503 (overloaded) / 429 (rate limited) under demand
// spikes. Retry a few times with exponential backoff before giving up — same
// approach as /api/extract's generateWithRetry.
async function streamWithRetry(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
): Promise<AsyncGenerator<GenerateContentResponse>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContentStream(params);
    } catch (e) {
      lastErr = e;
      const retryable = e instanceof ApiError && (e.status === 503 || e.status === 429);
      if (!retryable || attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function POST(request: Request) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Quota pre-check MUST happen before the stream starts — once streaming begins
  // the HTTP status can no longer change (see Next streaming HTTP contract).
  const { used, limit } = await getChatUsage(sb, user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit", used, limit }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chat is not configured." }, { status: 503 });
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const turns = Array.isArray(body?.messages) ? body.messages : [];
  if (turns.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Whole-portfolio context: fetch all of the user's properties (RLS-scoped).
  const { data: rows } = await sb
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  const properties = (rows ?? []) as unknown as Property[];
  const byId = new Map(properties.map((p) => [p.id, p]));

  // View awareness: if the client says a specific property is open, tell the
  // model so deictic phrases ("diese Immobilie") resolve to it. Data scope is
  // unchanged — the assistant still sees the whole portfolio.
  const viewed = body.context?.propertyId ? byId.get(body.context.propertyId) : undefined;
  const viewingLine = viewed
    ? `\nThe user is currently viewing the property ${JSON.stringify(viewed.name)} (id=${viewed.id}); resolve phrases like "diese Immobilie"/"dieses Objekt" to it unless they clearly mean another.\n`
    : "\n";

  // Computed once (KPIs are derived for every property) and reused across the
  // tool-loop turns.
  const systemInstruction = systemPrompt(buildPortfolioSummary(properties), viewingLine);

  const ai = new GoogleGenAI({ apiKey });
  const contents: Content[] = turns.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ChatStreamEvent) => controller.enqueue(sse(e));

      // Executes a read-only tool call against the caller's data and returns the
      // JSON payload to feed back to the model as a functionResponse.
      const runReadTool = async (call: FunctionCall): Promise<Record<string, unknown>> => {
        const args = (call.args ?? {}) as Record<string, unknown>;
        if (call.name === TOOL.listPortfolio) {
          return { properties: properties.map((p) => ({ id: p.id, name: p.name, inputs: p.inputs })) };
        }
        if (call.name === TOOL.getProperty) {
          const p = byId.get(String(args.propertyId));
          return p ? { id: p.id, name: p.name, address: p.address, inputs: p.inputs } : { error: "Property not found" };
        }
        if (call.name === TOOL.readPropertyDocuments) {
          const p = byId.get(String(args.propertyId));
          if (!p) return { error: "Property not found" };
          const answer = await answerFromPropertyDocuments(
            ai,
            sb,
            user.id,
            p.id,
            String(args.question ?? ""),
          );
          return { answer };
        }
        return { error: "Unknown tool" };
      };

      // Turns a proposePropertyFieldChange call into a confirmation proposal.
      // Returns false (with an explanatory text event already sent) if the call
      // can't be honoured, so we don't surface a broken card.
      const emitProposal = (call: FunctionCall): boolean => {
        const args = (call.args ?? {}) as Record<string, unknown>;
        const property = byId.get(String(args.propertyId));
        const def = getFieldDef(String(args.field));
        if (!property || !def) {
          send({ type: "text", delta: "\n\n(Diese Änderung konnte ich keinem bearbeitbaren Feld zuordnen.)" });
          return false;
        }
        const value = validateFieldValue(def, args.newValue);
        if (value === null) {
          send({ type: "text", delta: `\n\n(Der Wert liegt außerhalb des zulässigen Bereichs ${def.min}–${def.max}.)` });
          return false;
        }
        const oldValue = readFieldValue(property.inputs as PropertyInputs, def);
        send({
          type: "proposal",
          proposal: {
            id: crypto.randomUUID(),
            propertyId: property.id,
            propertyName: property.name,
            field: def.id,
            unit: def.unit,
            oldValue: oldValue ?? null,
            newValue: value,
          },
        });
        return true;
      };

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const result = await streamWithRetry(ai, {
            model: MODEL,
            contents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
              temperature: 0.2,
            },
          });

          const calls: FunctionCall[] = [];
          for await (const chunk of result) {
            const fc = chunk.functionCalls;
            if (fc?.length) calls.push(...fc);
            const text = chunk.text;
            if (text) send({ type: "text", delta: text });
          }

          if (calls.length === 0) break; // model produced its final answer

          // A write proposal ends the turn — the model never applies changes.
          const propose = calls.find((c) => c.name === TOOL.proposePropertyFieldChange);
          if (propose) {
            emitProposal(propose);
            break;
          }

          // Read tools: record the model's call turn, execute, feed results back.
          contents.push({ role: "model", parts: calls.map((c) => ({ functionCall: c })) });
          const responseParts: Part[] = [];
          for (const call of calls) {
            const response = await runReadTool(call);
            responseParts.push({ functionResponse: { name: call.name ?? "", response } });
          }
          contents.push({ role: "user", parts: responseParts });
        }

        // Count this successful turn against the monthly quota (atomic, capped).
        await consumeChatUsage(sb);
        send({ type: "done" });
      } catch (e) {
        console.error("Portfolio chat failed:", e);
        // Surface a sustained model overload distinctly so the user knows to retry.
        const busy = e instanceof ApiError && (e.status === 503 || e.status === 429);
        send({ type: "error", error: busy ? "busy" : "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
