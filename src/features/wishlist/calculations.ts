import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";
import type { PropertyInputs } from "@/lib/supabase";
import {
  totalNebenkostenPct,
  type WishlistGlobalAssumptions,
  type WishlistProperty,
  type WishlistRowKpis,
} from "./types";

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// The rent figure that drives KPIs, per the global Ist/Soll toggle. Falls back
// to the other value when the preferred one is missing.
export function effectiveRent(
  row: Pick<WishlistProperty, "istMiete" | "sollMiete">,
  g: Pick<WishlistGlobalAssumptions, "rentBasis">
): number {
  const ist = row.istMiete ?? 0;
  const soll = row.sollMiete ?? 0;
  return g.rentBasis === "ist" ? ist || soll : soll || ist;
}

// Assemble a full portfolio PropertyInputs from an analyse object so the
// wishlist and portfolio share one calculation engine. Financing (zins/tilgung)
// comes from the global bar; everything else is per-object.
export function wishlistToPropertyInputs(
  row: WishlistProperty,
  g: WishlistGlobalAssumptions
): PropertyInputs {
  const kaufpreis = row.kaufpreis ?? 0;
  const eigenanteil =
    row.eigenanteil ?? (kaufpreis * g.defaultEigenanteilPct) / 100;
  const ex = row.extras;
  return {
    kaufpreis,
    nebenkosten: ex.nebenkosten,
    eigenanteil,
    zins: g.zins,
    tilgung: g.tilgung,
    zinsbindung: 10,
    loanStartDate: getCurrentMonth(),
    kaltmiete: effectiveRent(row, g),
    nichtUmlagefaehig: ex.nichtUmlagefaehig,
    leerstand: ex.leerstand,
    ruecklagen: ex.ruecklagen,
    mietentwicklung: ex.mietentwicklung,
    wertentwicklung: ex.wertentwicklung,
    tax: ex.tax,
  };
}

export function calculateWishlistRowKpis(
  row: WishlistProperty,
  g: WishlistGlobalAssumptions
): WishlistRowKpis {
  const inputs = wishlistToPropertyInputs(row, g);
  const kaufpreis = inputs.kaufpreis;
  const wohnflaeche = row.wohnflaeche ?? 0;
  const kaltmiete = inputs.kaltmiete;

  const pricePerSqm =
    kaufpreis > 0 && wohnflaeche > 0 ? kaufpreis / wohnflaeche : null;

  if (kaufpreis <= 0 || kaltmiete <= 0) {
    return { pricePerSqm, mietrendite: null, monthlyCashFlow: null, ekRendite: null };
  }

  // Yield: brutto = Kaltmiete×12 / Kaufpreis; netto subtracts the real running
  // costs (vacancy loss, reserves, non-allocable) sourced from the first year.
  const fullCf = calculateCashFlow(inputs).years[0];
  const grossAnnualRent = kaltmiete * 12;
  const netAnnualRent =
    grossAnnualRent -
    (fullCf?.leerstandVerlust ?? 0) -
    (fullCf?.ruecklagen ?? 0) -
    (fullCf?.nichtUmlagefaehig ?? 0);
  const mietrendite =
    ((g.yieldMode === "netto" ? netAnnualRent : grossAnnualRent) / kaufpreis) *
    100;

  // Cashflow honours the comparison-table view toggles by zeroing excluded buckets.
  const cf = g.cashflowSettings;
  const toggledInputs: PropertyInputs = {
    ...inputs,
    leerstand: cf.subtractVacancy ? inputs.leerstand : 0,
    ruecklagen: cf.subtractReserves ? inputs.ruecklagen : 0,
    nichtUmlagefaehig: cf.subtractNonAllocable ? inputs.nichtUmlagefaehig : 0,
  };
  const toggledCf = calculateCashFlow(toggledInputs);
  const monthlyCashFlow = toggledCf.monthlyCashFlow;

  // EK-Rendite: (annual cashflow + [optional Tilgung Y1]) / total invested capital.
  const nebenkostenAbsolut =
    kaufpreis * (totalNebenkostenPct(inputs.nebenkosten) / 100);
  const totalCapital = inputs.eigenanteil + nebenkostenAbsolut;
  let ekRendite: number | null = null;
  if (totalCapital > 0) {
    const mortgage = calculateMortgage(toggledInputs);
    const tilgungY1 =
      mortgage.loanAmount - (mortgage.schedule[0]?.balance ?? mortgage.loanAmount);
    const numerator =
      toggledCf.annualCashFlow +
      (g.ekReturnSettings.includeTilgung ? tilgungY1 : 0);
    ekRendite = (numerator / totalCapital) * 100;
  }

  return { pricePerSqm, mietrendite, monthlyCashFlow, ekRendite };
}
