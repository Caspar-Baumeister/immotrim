import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getRequestUser } from "@/lib/supabase/request";
import { isEntitled } from "@/lib/entitlement";
import { getMonthlyUsage, consumeMonthlyUsage } from "@/lib/ai-usage";
import { extractFromDocs, type ReqDoc } from "@/lib/extraction/core";
import type { ExtractResponse } from "@/features/property-input/extraction-types";

export const runtime = "nodejs";
export const maxDuration = 60;

// iPhone app: extract property fields from uploaded documents. Same Gemini core
// as /api/extract in mode "property", but Bearer-token auth + entitlement gate.
// Body: { docs: [{ path, name }] } where path is "<uid>/<group>/<file>" in the
// property-documents bucket (uploaded by the app through Supabase storage).

const MAX_DOCS = 10;

// Mobile-facing error codes for the extraction core's failure kinds.
const FAILURE_CODES = {
  forbidden_path: "forbidden",
  not_found: "not_found",
  too_large: "too_large",
  upload_failed: "upstream",
  busy: "busy",
  failed: "upstream",
} as const;

function parseDocs(body: unknown): ReqDoc[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { docs?: unknown }).docs;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_DOCS) return null;
  const docs: ReqDoc[] = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") return null;
    const { path, name } = d as { path?: unknown; name?: unknown };
    if (typeof path !== "string" || !path.trim()) return null;
    const fallbackName = path.split("/").pop() ?? path;
    docs.push({ path, name: typeof name === "string" && name.trim() ? name : fallbackName });
  }
  return docs;
}

export async function POST(request: Request) {
  const { sb, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await isEntitled(sb, user.id))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  const { used, limit } = await getMonthlyUsage(sb, user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit", used, limit }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let docs: ReqDoc[] | null;
  try {
    docs = parseDocs(await request.json());
  } catch {
    docs = null;
  }
  if (!docs) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const ai = new GoogleGenAI({ apiKey });
  const result = await extractFromDocs(sb, ai, user, docs, "property");
  if (!result.ok) {
    return NextResponse.json({ error: FAILURE_CODES[result.code] }, { status: result.status });
  }
  if (!result.empty) await consumeMonthlyUsage(sb);
  return NextResponse.json({ fields: result.fields } as ExtractResponse);
}
