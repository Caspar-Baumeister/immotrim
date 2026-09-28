import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isEntitled } from "@/lib/entitlement";
import { renderPortfolioReport, type RenderReportResult } from "@/lib/report/render";
import type { ReportConfig } from "@/features/report/report-types";

export const runtime = "nodejs";
export const maxDuration = 60;

// iPhone app: the bank-facing "Immobilienübersicht" PDF (report variant
// "portfolio"). Bearer-token auth; entitlement includes the trial, unlike the
// web bank report which requires a paid plan.
// Body: { investorName?: string, propertyIds?: string[], includeTax?: boolean,
//         includeImages?: boolean }

type MobileReportBody = {
  investorName?: string;
  propertyIds: string[];
  includeTax: boolean;
  includeImages: boolean;
};

const FAILURES: Record<
  Extract<RenderReportResult, { ok: false }>["code"],
  { error: string; status: number }
> = {
  no_properties: { error: "bad_request", status: 400 },
  job_failed: { error: "server_error", status: 500 },
  render_failed: { error: "upstream", status: 502 },
};

function parseBody(raw: unknown): MobileReportBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (b.investorName !== undefined && typeof b.investorName !== "string") return null;
  if (b.propertyIds !== undefined && !Array.isArray(b.propertyIds)) return null;
  const propertyIds = ((b.propertyIds as unknown[] | undefined) ?? []).filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  return {
    investorName: typeof b.investorName === "string" ? b.investorName : undefined,
    propertyIds,
    includeTax: b.includeTax === undefined ? true : b.includeTax === true,
    includeImages: b.includeImages === undefined ? true : b.includeImages === true,
  };
}

export async function POST(request: Request) {
  const { sb, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await isEntitled(sb, user.id))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  let body: MobileReportBody | null;
  try {
    body = parseBody(await request.json());
  } catch {
    body = null;
  }
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const config: ReportConfig = {
    includeTitleImage: false,
    includePropertyImages: body.includeImages,
    includeProfile: false,
    includeCharts: true,
    includeFinancing: true,
    includeTax: body.includeTax,
    includeNotes: false,
    selectedPropertyIds: body.propertyIds,
    variant: "portfolio",
  };

  const origin = process.env.REPORT_BASE_URL || new URL(request.url).origin;
  const result = await renderPortfolioReport({
    sb,
    admin: getSupabaseAdmin(),
    user,
    config,
    investorName: body.investorName,
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
        "attachment; filename=\"Immobilienuebersicht.pdf\"; filename*=UTF-8''Immobilien%C3%BCbersicht.pdf",
      "Cache-Control": "no-store",
    },
  });
}
