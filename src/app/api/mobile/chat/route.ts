import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  Type,
  ApiError,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { getRequestUser, type RequestSupabase } from "@/lib/supabase/request";
import { isEntitled } from "@/lib/entitlement";
import type { Json, Property } from "@/lib/supabase/types";
import {
  calculatePortfolioKpis,
  type PortfolioProperty,
} from "@/features/portfolio/calculations";
import { computeReportMetrics, missingReportFields } from "@/features/report/report-metrics";
import {
  CHAT_FIELDS,
  applyFieldUpdate,
  describeChatFields,
  isChatField,
  openChatFields,
  type ChatField,
} from "@/lib/chat/property-fields";
import { buildChatSystemPrompt, isGermanLocale } from "@/lib/chat/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

// iPhone app: portfolio chat with Gemini function calling. The model sees the
// whole portfolio + KPIs in the system prompt and may persist facts the user
// states through update_property_field; writes go through the user's own
// RLS-scoped client. Chat text is sent to Gemini and not stored anywhere.
//
// Body:     { messages: [{ role: "user" | "assistant", content }], locale }
// Response: { reply, updates: [{ propertyId, propertyName, field, value }] }

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Monthly chat cap per user, enforced by the consume_ai_chat RPC (429 "limit").
const CHAT_MONTHLY_LIMIT = Number(process.env.AI_CHAT_MONTHLY_LIMIT ?? 300);
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
// Tool rounds before we force a plain-text answer.
const MAX_TOOL_ROUNDS = 4;
const TOOL_NAME = "update_property_field";

type ChatMessage = { role: "user" | "model"; content: string };

type ChatUpdate = {
  propertyId: string;
  propertyName: string;
  field: ChatField;
  value: string | number;
};

const UPDATE_TOOL: FunctionDeclaration = {
  name: TOOL_NAME,
  description:
    "Saves one fact about one of the user's properties. Call it whenever the user states or corrects a value for a property (year built, rent, interest rate, market value, address, ...). Available fields: " +
    describeChatFields() +
    ". Numbers are plain numbers (dot as decimal separator, no units), months YYYY-MM, dates YYYY-MM-DD.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      property_id: {
        type: Type.STRING,
        description: "The id of the property from the portfolio data.",
      },
      field: {
        type: Type.STRING,
        enum: [...CHAT_FIELDS],
        description: "The field to update.",
      },
      value: {
        type: Type.STRING,
        description:
          "The new value as text: numbers like 1900 or 3.75, months as YYYY-MM, dates as YYYY-MM-DD, free text as is.",
      },
    },
    required: ["property_id", "field", "value"],
  },
};

// ─── Request parsing ─────────────────────────────────────────────────────────

function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (typeof content !== "string") return null;
    const text = content.trim();
    if (!text) continue;
    if (role === "user") out.push({ role: "user", content: text.slice(0, MAX_MESSAGE_CHARS) });
    else if (role === "assistant" || role === "model") {
      out.push({ role: "model", content: text.slice(0, MAX_MESSAGE_CHARS) });
    } else return null;
  }
  return out.length > 0 ? out : null;
}

// Gemini wants a history that starts with the user and alternates roles.
function toContents(messages: ChatMessage[]): Content[] {
  const recent = messages.slice(-MAX_MESSAGES);
  const contents: Content[] = [];
  for (const m of recent) {
    if (contents.length === 0 && m.role !== "user") continue;
    const last = contents[contents.length - 1];
    if (last && last.role === m.role) {
      last.parts = [...(last.parts ?? []), { text: m.content }];
    } else {
      contents.push({ role: m.role, parts: [{ text: m.content }] });
    }
  }
  return contents;
}

// ─── Tool execution ──────────────────────────────────────────────────────────

type ToolOutcome = {
  response: Record<string, unknown>;
  update: ChatUpdate | null;
};

async function runUpdateTool(
  sb: RequestSupabase,
  properties: Property[],
  args: Record<string, unknown> | undefined,
): Promise<ToolOutcome> {
  const propertyId = typeof args?.property_id === "string" ? args.property_id.trim() : "";
  const field = args?.field;
  const value = args?.value;

  if (!isChatField(field)) {
    return {
      response: {
        ok: false,
        error: `Unknown field "${String(field)}". Allowed fields: ${CHAT_FIELDS.join(", ")}.`,
      },
      update: null,
    };
  }
  const known = properties.find((p) => p.id === propertyId);
  if (!known) {
    return {
      response: {
        ok: false,
        error: `Unknown property id "${propertyId}". Use one of: ${properties
          .map((p) => `${p.name} = ${p.id}`)
          .join("; ")}.`,
      },
      update: null,
    };
  }

  // Re-read the row so we apply the change to the latest inputs (RLS-scoped).
  const { data: row, error: readError } = await sb
    .from("properties")
    .select("id, name, address, inputs")
    .eq("id", propertyId)
    .maybeSingle();
  if (readError || !row) {
    return {
      response: { ok: false, error: `Property "${propertyId}" could not be read.` },
      update: null,
    };
  }

  const current = {
    name: row.name,
    address: row.address,
    inputs: row.inputs as unknown as Property["inputs"],
  };
  const applied = applyFieldUpdate(current, field, value);
  if (!applied.ok) return { response: { ok: false, error: applied.error }, update: null };

  const { error: writeError } = await sb
    .from("properties")
    .update({
      ...(applied.patch.name !== undefined ? { name: applied.patch.name } : {}),
      ...(applied.patch.address !== undefined ? { address: applied.patch.address } : {}),
      ...(applied.patch.inputs ? { inputs: applied.patch.inputs as unknown as Json } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", propertyId);
  if (writeError) {
    console.error("[mobile chat] property update failed:", writeError);
    return {
      response: { ok: false, error: "Saving failed. Ask the user to try again later." },
      update: null,
    };
  }

  // Keep the in-memory copy current for later tool calls in this request.
  if (applied.patch.name !== undefined) known.name = applied.patch.name;
  if (applied.patch.address !== undefined) known.address = applied.patch.address;
  if (applied.patch.inputs) known.inputs = applied.patch.inputs;

  return {
    response: { ok: true, propertyId, propertyName: known.name, field, value: applied.value },
    update: { propertyId, propertyName: known.name, field, value: applied.value },
  };
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function generateWithRetry(
  ai: GoogleGenAI,
  contents: Content[],
  systemInstruction: string,
  withTools: boolean,
): Promise<GenerateContentResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          ...(withTools ? { tools: [{ functionDeclarations: [UPDATE_TOOL] }] } : {}),
          temperature: 0.3,
          maxOutputTokens: 1024,
          // Fast answers matter more than deep reasoning here; the numbers are
          // precomputed in the prompt.
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    } catch (e) {
      lastErr = e;
      const retryable = e instanceof ApiError && (e.status === 503 || e.status === 429);
      if (!retryable || attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function textOf(response: GenerateContentResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => (typeof p.text === "string" && !p.thought ? p.text : ""))
    .join("")
    .trim();
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { sb, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await isEntitled(sb, user.id))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  let messages: ChatMessage[] | null = null;
  let locale = "de";
  try {
    const body = (await request.json()) as { messages?: unknown; locale?: unknown } | null;
    messages = parseMessages(body?.messages);
    if (typeof body?.locale === "string" && body.locale.trim()) locale = body.locale.trim();
  } catch {
    messages = null;
  }
  if (!messages || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  // Atomic check-and-increment of the monthly chat counter. A missing RPC (deploy
  // before migration) must not take the chat down, so only an explicit "not
  // allowed" blocks the request.
  const { data: quota, error: quotaError } = await sb.rpc("consume_ai_chat", {
    p_limit: CHAT_MONTHLY_LIMIT,
  });
  if (quotaError) console.error("consume_ai_chat failed:", quotaError);
  const quotaRow = quota?.[0];
  if (quotaRow && quotaRow.allowed === false) {
    return NextResponse.json(
      { error: "limit", used: quotaRow.used, limit: CHAT_MONTHLY_LIMIT },
      { status: 429 },
    );
  }

  // ── Portfolio context (RLS scopes to this user) ─────────────────────────────
  const { data: rows } = await sb
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  const properties = (rows ?? []) as unknown as Property[];
  const portfolio: PortfolioProperty[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    inputs: p.inputs,
  }));

  const kpis = calculatePortfolioKpis(portfolio);
  const metrics = computeReportMetrics(portfolio);
  const openFields: Record<string, ChatField[]> = {};
  for (const p of portfolio) {
    openFields[p.id] = openChatFields(p.inputs, missingReportFields(p.inputs));
  }

  const systemInstruction = buildChatSystemPrompt({
    locale,
    today: new Date().toISOString().slice(0, 10),
    properties: portfolio,
    kpis,
    perProperty: metrics.perProperty,
    openFields,
  });

  // ── Tool loop ───────────────────────────────────────────────────────────────
  const ai = new GoogleGenAI({ apiKey });
  const contents = toContents(messages);
  const updates: ChatUpdate[] = [];
  let reply = "";

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const withTools = round < MAX_TOOL_ROUNDS;
      const response = await generateWithRetry(ai, contents, systemInstruction, withTools);
      const calls: FunctionCall[] = withTools ? (response.functionCalls ?? []) : [];

      if (calls.length === 0) {
        reply = textOf(response);
        break;
      }

      // Keep the model turn verbatim (it may carry text next to the calls).
      const modelContent = response.candidates?.[0]?.content;
      contents.push(
        modelContent ?? {
          role: "model",
          parts: calls.map((fc): Part => ({ functionCall: fc })),
        },
      );

      const responseParts: Part[] = [];
      for (const call of calls) {
        const outcome: ToolOutcome =
          call.name === TOOL_NAME
            ? await runUpdateTool(sb, properties, call.args)
            : { response: { ok: false, error: `Unknown tool "${call.name ?? ""}".` }, update: null };
        if (outcome.update) updates.push(outcome.update);
        responseParts.push({
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: call.name ?? TOOL_NAME,
            response: outcome.response,
          },
        });
      }
      contents.push({ role: "user", parts: responseParts });
    }
  } catch (e) {
    console.error("[mobile chat] Gemini call failed:", e);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  if (!reply) {
    reply = isGermanLocale(locale)
      ? updates.length > 0
        ? "Erledigt, die Angaben sind gespeichert."
        : "Dazu kann ich gerade nichts sagen. Formuliere die Frage bitte noch einmal."
      : updates.length > 0
        ? "Done, the details are saved."
        : "I cannot answer that right now. Please rephrase the question.";
  }

  return NextResponse.json({ reply, updates });
}
