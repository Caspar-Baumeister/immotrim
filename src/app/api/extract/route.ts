import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSessionUser } from "@/lib/firebase/session";
import { hasPlus } from "@/lib/dal";
import { getMonthlyUsage, consumeMonthlyUsage } from "@/lib/data/users";
import { extractFromDocs, isExtractMode, type ExtractMode, type ReqDoc } from "@/lib/extraction/core";
import type { ExtractResponse } from "@/features/property-input/extraction-types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Reads uploaded documents with Gemini and returns suggested property fields.
// Capped per user and month: a few runs for free accounts, generous with Plus.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const plus = await hasPlus(user.uid);
  const { used, limit } = await getMonthlyUsage(user.uid, plus);
  if (used >= limit) {
    // Free accounts that used their tries are asked to upgrade.
    return plus
      ? NextResponse.json({ error: "limit", used, limit }, { status: 429 })
      : NextResponse.json({ error: "payment_required", used, limit }, { status: 402 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Extraction is not configured." }, { status: 503 });

  let docs: ReqDoc[];
  let mode: ExtractMode = "property";
  try {
    const body = await request.json();
    docs = Array.isArray(body?.docs) ? body.docs.slice(0, 10) : [];
    if (isExtractMode(body?.mode)) mode = body.mode;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (docs.length === 0) return NextResponse.json({ error: "No documents provided" }, { status: 400 });

  const result = await extractFromDocs(new GoogleGenAI({ apiKey }), user.uid, docs, mode);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.empty) return NextResponse.json({ fields: {} } satisfies ExtractResponse);
  await consumeMonthlyUsage(user.uid);
  return NextResponse.json({ fields: result.fields } as ExtractResponse);
}
