import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { hasPlus } from "@/lib/dal";
import { getUserDoc, userRef } from "@/lib/data/users";
import { launchBrowser } from "@/lib/pdf/chromium";
import { buildBankOverview } from "@/features/bank-overview/overview";
import { renderBankOverviewHtml } from "@/features/bank-overview/render-html";
import type { Property, PropertyInputs } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/bank-overview          → HTML preview (every account)
// GET /api/bank-overview?pdf=1    → PDF download (Plus)
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const wantPdf = new URL(request.url).searchParams.has("pdf");
  if (wantPdf && !(await hasPlus(user.uid))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  const [doc, snap] = await Promise.all([
    getUserDoc(user.uid),
    userRef(user.uid).collection("properties").orderBy("created_at", "asc").get(),
  ]);
  const properties: Property[] = snap.docs.map((d) => ({
    id: d.id,
    user_id: user.uid,
    name: d.get("name") ?? "",
    address: d.get("address") ?? null,
    inputs: d.get("inputs") as PropertyInputs,
    created_at: d.get("created_at"),
    updated_at: d.get("updated_at"),
  }));
  const owner = doc?.displayName || user.email;
  const html = renderBankOverviewHtml(buildBankOverview(properties, owner ?? null));

  if (!wantPdf) {
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", landscape: true, printBackground: true, preferCSSPageSize: true });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Immotrim-Portfoliouebersicht-${stamp}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[bank-overview] pdf failed", e);
    return NextResponse.json({ error: "render_failed" }, { status: 502 });
  } finally {
    await browser.close();
  }
}
