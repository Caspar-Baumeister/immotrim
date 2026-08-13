import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasPaidPlan } from "@/lib/dal";
import { launchBrowser } from "@/lib/pdf/chromium";
import { getBank, hasBankDocument, isValidBankId } from "@/features/banks/registry";
import type {
  SelbstauskunftKonzept,
  SelbstauskunftPayload,
  SelbstauskunftProfile,
} from "@/features/banks/types";
import type { PortfolioProperty } from "@/features/portfolio/calculations";
import type { Property, Json } from "@/lib/supabase";
import type { Stammdaten, Haushalt, Strategie } from "@/features/profile/types";
import {
  KONZEPT_TYPE_LABELS,
  normaliseKonzeptType,
  type KonzeptFinanzierung,
  type KonzeptObjekt,
} from "@/features/konzepte/types";

const BUCKET = "property-documents";

export const runtime = "nodejs";
export const maxDuration = 60;

// The applicant name comes from the explicit request field first, then the stored
// profile name. We never fall back to the email — an email is not a name and
// shouldn't end up on a bank document. "Eigentümer" is the last-resort placeholder.
function investorNameFrom(
  requested: string | undefined,
  user: { user_metadata?: Record<string, unknown> }
): string {
  const fromRequest = (requested ?? "").trim();
  if (fromRequest) return fromRequest;
  const meta = user.user_metadata ?? {};
  const stored = ((meta.full_name as string) || (meta.name as string) || "").trim();
  if (stored) return stored;
  return "Eigentümer";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bankId: string }> }
) {
  const { bankId } = await params;
  const bank = getBank(bankId);
  if (!isValidBankId(bankId) || !bank) {
    return NextResponse.json({ error: "Unknown bank" }, { status: 404 });
  }
  // Banks without a document component would render an empty print page and the
  // renderer would time out waiting for #report-ready — fail fast instead.
  if (!hasBankDocument(bankId)) {
    return NextResponse.json({ error: "No document for this bank" }, { status: 404 });
  }

  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Generating a bank Selbstauskunft requires a PAID account (not just the trial),
  // matching the Portfolio-Finanzierungsbericht gate.
  if (!(await hasPaidPlan(user.id))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  // ── Parse optional request fields ────────────────────────────────────────────
  // German-only app: documents are always rendered in German.
  const locale = "de";
  let requestedName: string | undefined;
  let conceptId: string | undefined;
  let objectId: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.investorName === "string") requestedName = body.investorName;
    if (typeof body?.conceptId === "string") conceptId = body.conceptId;
    if (typeof body?.objectId === "string") objectId = body.objectId;
  } catch {
    // Body is optional — defaults are fine.
  }

  // ── Load the financing concept, if one was selected (RLS scopes to this user) ─
  let konzept: SelbstauskunftKonzept | undefined;
  if (conceptId) {
    const { data: row } = await sb
      .from("financing_concepts")
      .select("*")
      .eq("id", conceptId)
      .maybeSingle();
    if (!row) {
      return NextResponse.json({ error: "Unknown concept" }, { status: 404 });
    }
    // The selected concept object; legacy financing_concepts.objekt jsonb is the
    // fallback for pre-multi-object concepts / callers that send no objectId.
    let objekt = (row.objekt ?? {}) as KonzeptObjekt;
    if (objectId) {
      const { data: objRow } = await sb
        .from("concept_objects")
        .select("data")
        .eq("id", objectId)
        .eq("concept_id", conceptId)
        .maybeSingle();
      if (!objRow) {
        return NextResponse.json({ error: "Unknown object" }, { status: 404 });
      }
      objekt = (objRow.data ?? {}) as KonzeptObjekt;
    }
    const typ = normaliseKonzeptType(row.concept_type);
    konzept = {
      titel: row.title,
      typLabel: typ ? KONZEPT_TYPE_LABELS[typ] : undefined,
      beschreibung: row.description ?? undefined,
      objekt,
      finanzierung: (row.finanzierung ?? {}) as KonzeptFinanzierung,
    };
  }

  // ── Fetch the full portfolio (RLS scopes to this user) ───────────────────────
  const { data: rows } = await sb
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  const properties = (rows ?? []) as unknown as Property[];
  // Without a concept the form has nothing to describe, so an empty portfolio is
  // a hard error. WITH a concept the target journey is a NEW acquisition —
  // first-time buyers legitimately own nothing yet.
  if (properties.length === 0 && !konzept) {
    return NextResponse.json({ error: "No properties" }, { status: 400 });
  }

  const portfolio: PortfolioProperty[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    inputs: p.inputs,
  }));

  // ── Fetch the applicant profile + embed the strategy image as a data URL ─────
  const { data: profileRow } = await sb
    .from("profiles")
    .select("stammdaten, haushalt, strategie")
    .eq("user_id", user.id)
    .maybeSingle();

  const stammdaten = (profileRow?.stammdaten as Stammdaten) ?? {};
  const haushalt = (profileRow?.haushalt as Haushalt) ?? {};
  const strategie = (profileRow?.strategie as Strategie) ?? {};

  let imageDataUrl: string | undefined;
  if (strategie.imagePath) {
    const { data: blob } = await sb.storage.from(BUCKET).download(strategie.imagePath);
    if (blob) {
      const buf = Buffer.from(await blob.arrayBuffer());
      imageDataUrl = `data:${blob.type || "image/jpeg"};base64,${buf.toString("base64")}`;
    }
  }

  const profile: SelbstauskunftProfile = {
    stammdaten,
    haushalt,
    strategie,
    imageDataUrl,
  };

  // Prefer the Stammdaten name for the header, then the request/metadata fallback.
  const saName = [stammdaten.vorname, stammdaten.nachname]
    .filter(Boolean)
    .join(" ")
    .trim();

  const payload: SelbstauskunftPayload = {
    generatedAt: new Date().toISOString(),
    locale,
    bankId,
    investorName: investorNameFrom(requestedName || saName, user),
    properties: portfolio,
    profile,
    konzept,
  };

  // ── Persist the job under an unguessable token (read by the print page) ──────
  const admin = getSupabaseAdmin();
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
    return NextResponse.json({ error: "Could not prepare document" }, { status: 500 });
  }
  const token = job.id;

  // ── Render to PDF with headless Chromium ─────────────────────────────────────
  const origin = process.env.REPORT_BASE_URL || new URL(request.url).origin;
  const docUrl = `${origin}/selbstauskunft/document/${bankId}/${token}`;

  let pdf: Uint8Array;
  try {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      // On protected deployments (e.g. staging) the headless browser has no SSO
      // cookie and would be 401'd. Pass the automation bypass secret Vercel injects.
      const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (bypass) {
        await page.setExtraHTTPHeaders({ "x-vercel-protection-bypass": bypass });
      }
      await page.goto(docUrl, { waitUntil: "networkidle0", timeout: 45_000 });
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
    console.error("Selbstauskunft PDF generation failed:", e);
    await admin.from("report_jobs").delete().eq("id", token);
    return NextResponse.json({ error: "Rendering failed" }, { status: 502 });
  }

  // One-shot job — remove it now that the PDF is rendered.
  await admin.from("report_jobs").delete().eq("id", token);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Selbstauskunft-${bank.shortName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
