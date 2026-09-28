import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createServerSupabase } from "@/lib/supabase/server";
import { getMonthlyUsage, consumeMonthlyUsage } from "@/lib/ai-usage";
import {
  extractFromDocs,
  isExtractMode,
  type ExtractMode,
  type ReqDoc,
} from "@/lib/extraction/core";
import type { ExtractResponse } from "@/features/property-input/extraction-types";

export const runtime = "nodejs";

// Web document extraction (cookie session). The Gemini core (prompts, schemas,
// storage download, retries) lives in src/lib/extraction/core.ts and is shared
// with /api/mobile/extract.
export async function POST(request: Request) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // The only usage restriction: 500 AI extractions per user per month. Pre-check
  // here so an already-exhausted user doesn't spend a Gemini call; the actual
  // increment happens only after a successful extraction (see below).
  const { used, limit } = await getMonthlyUsage(sb, user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit", used, limit }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Extraction is not configured." }, { status: 503 });
  }

  let docs: ReqDoc[];
  let mode: ExtractMode = "property";
  try {
    const body = await request.json();
    docs = Array.isArray(body?.docs) ? body.docs : [];
    if (isExtractMode(body?.mode)) mode = body.mode;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (docs.length === 0) {
    return NextResponse.json({ error: "No documents provided" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const result = await extractFromDocs(sb, ai, user, docs, mode);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.empty) {
    return NextResponse.json({ fields: {} } satisfies ExtractResponse);
  }
  // Count this successful extraction against the monthly quota (atomic, capped).
  await consumeMonthlyUsage(sb);
  return NextResponse.json({ fields: result.fields } as ExtractResponse);
}
