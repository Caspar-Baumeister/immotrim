import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PublicShareHeader } from "@/features/portfolio/components/PublicShareHeader";
import { PortfolioAnalytics } from "@/features/portfolio/components/PortfolioAnalytics";
import type { PortfolioProperty } from "@/features/portfolio/calculations";
import type { PropertyInputs } from "@/lib/supabase";

// Personal financials — never let search engines index a shared portfolio.
export const metadata: Metadata = { robots: { index: false } };

type Props = { params: Promise<{ token: string }> };

// Strip everything identifying/physical from a property, keeping only the
// financial inputs that drive the aggregate KPIs and charts. Dropped: address,
// real name, and inputs.report (objekttyp, marktwert, stadt, wohnfläche, zimmer,
// baujahr, kaufdatum, hausgeld, notizen) + inputs.selbstauskunft.
function sanitize(
  row: { id: string; inputs: PropertyInputs },
  index: number,
  objektLabel: string,
): PortfolioProperty {
  const i = row.inputs;
  const inputs: PropertyInputs = {
    kaufpreis: i.kaufpreis,
    nebenkosten: i.nebenkosten,
    eigenanteil: i.eigenanteil,
    zins: i.zins,
    tilgung: i.tilgung,
    zinsbindung: i.zinsbindung,
    loanStartDate: i.loanStartDate,
    kaltmiete: i.kaltmiete,
    nichtUmlagefaehig: i.nichtUmlagefaehig,
    leerstand: i.leerstand,
    ruecklagen: i.ruecklagen,
    mietentwicklung: i.mietentwicklung,
    wertentwicklung: i.wertentwicklung,
    tax: i.tax,
  };
  return {
    id: row.id,
    name: `${objektLabel} ${index + 1}`,
    address: null,
    inputs,
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const t = await getTranslations("share");
  const admin = getSupabaseAdmin();

  // Resolve the token → owning user via the service-role client (bypasses RLS).
  const share = await admin
    .from("portfolio_shares")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (share.error || !share.data) notFound();

  const propsResult = await admin
    .from("properties")
    .select("id, inputs, created_at")
    .eq("user_id", share.data.user_id)
    .order("created_at", { ascending: false });
  if (propsResult.error) notFound();

  const rows = (propsResult.data ?? []) as unknown as {
    id: string;
    inputs: PropertyInputs;
  }[];
  const portfolioInputs = rows.map((row, idx) => sanitize(row, idx, t("objektLabel")));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PublicShareHeader />

      <main className="flex-1 w-full mx-auto max-w-7xl p-4 sm:p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>

        {portfolioInputs.length > 0 ? (
          <PortfolioAnalytics portfolioInputs={portfolioInputs} />
        ) : (
          <p className="text-sm text-muted-foreground py-16 text-center">
            {t("empty")}
          </p>
        )}

        {/* Bottom CTA — convert an interested viewer into a signup. */}
        <div className="rounded-xl border border-[#6c5ce7]/30 bg-[#6c5ce7]/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-sm font-semibold text-foreground">{t("ctaTitle")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("ctaSubtitle")}</p>
          </div>
          <Link
            href={"/"}
            className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {t("cta")}
          </Link>
        </div>
      </main>
    </div>
  );
}
