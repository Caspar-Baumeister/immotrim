import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, Json, Property } from "@/lib/supabase/types";
import type { getSupabaseAdmin } from "@/lib/supabase/admin";
import { launchBrowser } from "@/lib/pdf/chromium";
import type { PortfolioProperty } from "@/features/portfolio/calculations";
import {
  MAX_DETAIL_PROPERTIES,
  type ReportConfig,
  type ReportPayload,
  type ReportStrategie,
} from "@/features/report/report-types";
import type { Strategie } from "@/features/profile/types";
import { rankPropertiesForReport } from "@/features/report/report-metrics";

// Shared PDF pipeline behind /api/portfolio/report (web, cookie session) and
// /api/mobile/report (iPhone app, Bearer token): load the portfolio under RLS,
// sanitise the config, sign image URLs, persist a one-shot report_jobs row and
// print /report/<token> with headless Chromium. Auth, entitlement and the HTTP
// response stay in the routes.

const BUCKET = "property-documents";

export type RenderReportInput = {
  // User-scoped client (RLS): properties, report_images, profiles, storage.
  sb: SupabaseClient<Database>;
  // Service-role client: report_jobs (no RLS policies, server only).
  admin: ReturnType<typeof getSupabaseAdmin>;
  user: User;
  config: ReportConfig;
  // Cover name as requested by the caller; see investorNameFrom for the fallback.
  investorName?: string;
  // Origin the headless browser opens the print page on.
  origin: string;
};

export type RenderReportResult =
  | { ok: true; pdf: Uint8Array }
  | { ok: false; code: "no_properties" | "job_failed" | "render_failed" };

// The cover name comes from the explicit request field first (the report dialog
// requires the user to enter/confirm it), then the stored profile name. We never
// fall back to the email — an email is not a name and shouldn't end up on a bank
// document. "Eigentümer" is the last-resort placeholder.
export function investorNameFrom(
  requested: string | undefined,
  user: { user_metadata?: Record<string, unknown> },
): string {
  const fromRequest = (requested ?? "").trim();
  if (fromRequest) return fromRequest;
  const meta = user.user_metadata ?? {};
  const stored = ((meta.full_name as string) || (meta.name as string) || "").trim();
  if (stored) return stored;
  return "Eigentümer";
}

export async function renderPortfolioReport({
  sb,
  admin,
  user,
  config,
  investorName,
  origin,
}: RenderReportInput): Promise<RenderReportResult> {
  // German-only app: reports are always rendered in German.
  const locale = "de";

  // ── Fetch the full portfolio (RLS scopes to this user) ──────────────────────
  const { data: rows } = await sb
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  const properties = (rows ?? []) as unknown as Property[];
  if (properties.length === 0) {
    return { ok: false, code: "no_properties" };
  }

  const portfolio: PortfolioProperty[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    inputs: p.inputs,
  }));
  const validIds = new Set(portfolio.map((p) => p.id));

  // Sanitise the selection: keep only existing ids, cap to the detail-page limit,
  // and fall back to the bank-relevance ranking if nothing valid was provided.
  let selectedPropertyIds = (config.selectedPropertyIds ?? [])
    .filter((id) => validIds.has(id))
    .slice(0, MAX_DETAIL_PROPERTIES);
  if (selectedPropertyIds.length === 0) {
    selectedPropertyIds = rankPropertiesForReport(portfolio);
  }
  const safeConfig: ReportConfig = { ...config, selectedPropertyIds };

  // ── Resolve report images to short-lived signed URLs ────────────────────────
  let titleImageUrl: string | null = null;
  const propertyImageUrls: Record<string, string[]> = {};

  const { data: imageRows } = await sb.from("report_images").select("*");
  const images = imageRows ?? [];

  const sign = async (path: string): Promise<string | null> => {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  };

  if (safeConfig.includeTitleImage) {
    const title = images.find((i) => i.scope === "title");
    if (title) titleImageUrl = await sign(title.file_path);
  }
  if (safeConfig.includePropertyImages) {
    for (const id of selectedPropertyIds) {
      const imgs = images
        .filter((i) => i.scope === "property" && i.property_id === id)
        .slice(0, 2);
      const urls = (await Promise.all(imgs.map((i) => sign(i.file_path)))).filter(
        (u): u is string => Boolean(u),
      );
      if (urls.length > 0) propertyImageUrls[id] = urls;
    }
  }

  // ── Investor story for the profile page (Über mich + Strategie) ─────────────
  let strategie: ReportStrategie | undefined;
  if (safeConfig.includeProfile) {
    const { data: profileRow } = await sb
      .from("profiles")
      .select("strategie")
      .eq("user_id", user.id)
      .maybeSingle();
    const s = (profileRow?.strategie as Strategie) ?? {};
    const imageUrl = s.imagePath ? await sign(s.imagePath) : null;
    if (s.ueberMich || s.strategieText || imageUrl) {
      strategie = {
        ueberMich: s.ueberMich,
        strategieText: s.strategieText,
        imageUrl,
      };
    }
  }

  const payload: ReportPayload = {
    generatedAt: new Date().toISOString(),
    locale,
    investorName: investorNameFrom(investorName, user),
    config: safeConfig,
    properties: portfolio,
    titleImageUrl,
    propertyImageUrls,
    strategie,
  };

  // ── Persist the job under an unguessable token (read by the print page) ──────
  const { data: job, error: jobError } = await admin
    .from("report_jobs")
    .insert({
      user_id: user.id,
      locale,
      payload: payload as unknown as Json,
    })
    .select("id")
    .single();
  if (jobError || !job) {
    return { ok: false, code: "job_failed" };
  }
  const token = job.id;

  // ── Render to PDF with headless Chromium ─────────────────────────────────────
  const reportUrl = `${origin}/report/${token}`;

  let pdf: Uint8Array;
  try {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      // On protected deployments (e.g. staging Standard Protection) the headless
      // browser has no SSO cookie and would be 401'd. Pass the automation bypass
      // secret on every request the page makes — Vercel auto-populates this env
      // var when "Protection Bypass for Automation" is enabled for the project.
      const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (bypass) {
        await page.setExtraHTTPHeaders({ "x-vercel-protection-bypass": bypass });
      }
      await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 45_000 });
      await page.waitForSelector("#report-ready", { timeout: 20_000 });
      pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error("Report PDF generation failed:", e);
    await admin.from("report_jobs").delete().eq("id", token);
    return { ok: false, code: "render_failed" };
  }

  // One-shot job — remove it now that the PDF is rendered.
  await admin.from("report_jobs").delete().eq("id", token);

  return { ok: true, pdf };
}
