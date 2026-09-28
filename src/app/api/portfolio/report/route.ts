import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasPaidPlan } from "@/lib/dal";
import { renderPortfolioReport, type RenderReportResult } from "@/lib/report/render";
import type { ReportConfig } from "@/features/report/report-types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Unchanged web error contract for each pipeline failure.
const FAILURES: Record<
  Extract<RenderReportResult, { ok: false }>["code"],
  { error: string; status: number }
> = {
  no_properties: { error: "No properties", status: 400 },
  job_failed: { error: "Could not prepare report", status: 500 },
  render_failed: { error: "Rendering failed", status: 502 },
};

// Web bank report (cookie session). The PDF pipeline itself lives in
// src/lib/report/render.ts and is shared with /api/mobile/report.
export async function POST(request: Request) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Creating a Selbstauskunft / bank report requires a PAID account (not just the
  // free trial). Gated here so it holds for every caller — the in-app report
  // dialog and the Selbstauskunft funnel alike.
  if (!(await hasPaidPlan(user.id))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  // ── Parse request ──────────────────────────────────────────────────────────
  let config: ReportConfig;
  let requestedName: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.investorName === "string") requestedName = body.investorName;
    config = body.config as ReportConfig;
    if (!config || typeof config !== "object") throw new Error("bad config");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const origin = process.env.REPORT_BASE_URL || new URL(request.url).origin;
  const result = await renderPortfolioReport({
    sb,
    admin: getSupabaseAdmin(),
    user,
    config,
    investorName: requestedName,
    origin,
  });

  if (!result.ok) {
    const { error, status } = FAILURES[result.code];
    return NextResponse.json({ error }, { status });
  }

  return new NextResponse(Buffer.from(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // ASCII fallback + RFC-5987 encoding so the umlaut survives the header.
      "Content-Disposition":
        "attachment; filename=\"Investorenbroschuere.pdf\"; filename*=UTF-8''Investorenbrosch%C3%BCre.pdf",
      "Cache-Control": "no-store",
    },
  });
}
