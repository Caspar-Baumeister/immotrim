import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SelbstauskunftPayload } from "@/features/banks/types";
import { renderBankDocument } from "@/features/banks/documents";
import "@/features/banks/mbs/mbs.css";

// Headless print page. Reached only by the PDF renderer (and the owner via a
// short-lived token); it has no user session, so the job is loaded with the
// service-role client and validated by the unguessable token + expiry.
export const dynamic = "force-dynamic";

// Never index a print/handoff page.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ bankId: string; token: string }> };

function NotFound() {
  return (
    <div style={{ padding: 48, fontFamily: "system-ui", color: "#0f1115" }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Dokument nicht verfügbar</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
        Dieses Dokument ist abgelaufen oder existiert nicht.
      </p>
    </div>
  );
}

async function loadPayload(token: string): Promise<SelbstauskunftPayload | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("report_jobs")
    .select("payload, expires_at")
    .eq("id", token)
    .single();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload as unknown as SelbstauskunftPayload;
}

export default async function SelbstauskunftPrintPage({ params }: Props) {
  const { bankId, token } = await params;
  const payload = await loadPayload(token);
  if (!payload || payload.bankId !== bankId) return <NotFound />;

  return (
    <>
      {/* Force a clean light canvas regardless of the app's dark default, and hide
          the Next.js dev indicator so it never bleeds into a rendered PDF. */}
      <style>{`:root{color-scheme:light}html,body{background:#fff!important;margin:0}#__next-dev-tools-indicator,nextjs-portal{display:none!important}`}</style>
      {renderBankDocument(bankId, payload)}
    </>
  );
}
