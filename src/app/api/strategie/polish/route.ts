import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  ApiError,
  type GenerateContentResponse,
} from "@google/genai";
import { createServerSupabase } from "@/lib/supabase/server";
import { getMonthlyUsage, consumeMonthlyUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_INPUT_CHARS = 4000;

const FIELDS = {
  strategieText: {
    label: "Investmentstrategie",
    hint: "Es geht um die Immobilien-Investmentstrategie des Antragstellers (Ziele, Objekttypen, Lagen, Haltedauer, Finanzierungsansatz).",
  },
  ueberMich: {
    label: "Über mich",
    hint: "Es geht um eine kurze persönliche Vorstellung des Antragstellers (beruflicher Hintergrund, Erfahrung mit Immobilien, Motivation für die Finanzierung).",
  },
} as const;

type Field = keyof typeof FIELDS;

const POLISH_PROMPT = `Du bist ein Assistent, der Texte für die Selbstauskunft einer Immobilienfinanzierung ausformuliert.

Der Nutzer gibt dir Stichpunkte oder einen Rohtext. Formuliere daraus einen gut lesbaren, professionellen deutschen Fließtext, der gegenüber einer Bank seriös und überzeugend wirkt.

Regeln:
- Erfinde KEINE Fakten, Zahlen oder Details, die nicht im Ausgangstext stehen.
- Behalte alle genannten Fakten bei.
- Schreibe in der Ich-Perspektive.
- Kompakt bleiben: den Inhalt ausformulieren, nicht künstlich aufblähen.
- Gib NUR den fertigen Text zurück — ohne Anführungszeichen, Überschrift oder Kommentar.`;

export async function POST(request: Request) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { used, limit } = await getMonthlyUsage(sb, user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit", used, limit }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI polish is not configured." }, { status: 503 });
  }

  let field: Field;
  let text: string;
  try {
    const body = await request.json();
    field = body?.field;
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!(field in FIELDS)) {
    return NextResponse.json({ error: "Unknown field" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: "Text is too long" }, { status: 413 });
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const result = await generateWithRetry(
      ai,
      `Abschnitt: "${FIELDS[field].label}". ${FIELDS[field].hint}\n\nAusgangstext:\n${text}`,
    );
    const polished = result.text?.trim();
    if (!polished) {
      return NextResponse.json({ error: "Polish failed" }, { status: 502 });
    }
    await consumeMonthlyUsage(sb);
    return NextResponse.json({ text: polished });
  } catch (e) {
    console.error("Text polish failed:", e);
    if (e instanceof ApiError && (e.status === 503 || e.status === 429)) {
      return NextResponse.json({ error: "busy" }, { status: 503 });
    }
    return NextResponse.json({ error: "Polish failed" }, { status: 502 });
  }
}

async function generateWithRetry(
  ai: GoogleGenAI,
  contents: string,
): Promise<GenerateContentResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: POLISH_PROMPT,
          temperature: 0.4,
          maxOutputTokens: 1024,
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
