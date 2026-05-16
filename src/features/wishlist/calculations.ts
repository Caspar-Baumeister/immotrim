import type { PropertyInputs } from "@/lib/supabase";
import { calculateCapRate } from "@/features/cap-rate/calculations";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateReturns } from "@/features/returns/calculations";
import type { WishlistGlobalAssumptions, WishlistProperty, WishlistRowKpis } from "./types";

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toPropertyInputs(
  row: WishlistProperty,
  g: WishlistGlobalAssumptions
): PropertyInputs {
  const kaufpreis = row.kaufpreis ?? 0;
  const fallbackEigenanteil = (kaufpreis * g.defaultEigenanteilPct) / 100;
  const kaltmiete = row.kaltmiete ?? 0;

  return {
    kaufpreis,
    nebenkosten: {
      grunderwerbsteuerPct: row.nebenkostenPct,
      notarGrundbuchPct: 0,
      maklerprovisionPct: 0,
      sonstigePct: 0,
    },
    eigenanteil: row.eigenanteil ?? fallbackEigenanteil,
    zins: g.zins,
    tilgung: g.tilgung,
    zinsbindung: 10,
    loanStartDate: getCurrentMonth(),
    annuitaetendarlehen: true,
    kaltmiete,
    nichtUmlagefaehig: (kaltmiete * row.nichtUmlagefaehigPctOfMiete) / 100,
    leerstand: g.leerstandPct,
    ruecklagen: (kaltmiete * g.ruecklagenPctOfMiete) / 100,
    mietentwicklung: 0,
    wertentwicklung: 0,
  };
}

export function calculateWishlistRowKpis(
  row: WishlistProperty,
  g: WishlistGlobalAssumptions
): WishlistRowKpis {
  const hasPrice = (row.kaufpreis ?? 0) > 0;
  const hasArea = (row.wohnflaeche ?? 0) > 0;
  const hasRent = (row.kaltmiete ?? 0) > 0;

  const pricePerSqm = hasPrice && hasArea ? row.kaufpreis! / row.wohnflaeche! : null;

  if (!hasPrice) {
    return { pricePerSqm, bruttoMietrendite: null, monthlyCashFlow: null, ekRendite: null };
  }

  const inputs = toPropertyInputs(row, g);
  const capRate = calculateCapRate(inputs);
  const cashFlow = calculateCashFlow(inputs);
  const returns = calculateReturns(inputs);

  return {
    pricePerSqm,
    bruttoMietrendite: hasRent ? capRate.bruttoMietrenditeY1 : null,
    monthlyCashFlow: hasRent ? cashFlow.monthlyCashFlow : null,
    ekRendite: hasRent ? returns.ekRenditeY1 : null,
  };
}
