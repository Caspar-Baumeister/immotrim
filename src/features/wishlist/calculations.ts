import { calculateMortgage } from "@/features/mortgage/calculations";
import type {
  WishlistGlobalAssumptions,
  WishlistProperty,
  WishlistRowKpis,
} from "./types";

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mortgageInputsFor(
  row: WishlistProperty,
  g: WishlistGlobalAssumptions
) {
  const kaufpreis = row.kaufpreis ?? 0;
  const fallbackEigenanteil = (kaufpreis * g.defaultEigenanteilPct) / 100;
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
    kaltmiete: row.kaltmiete ?? 0,
    nichtUmlagefaehig: 0,
    leerstand: 0,
    ruecklagen: 0,
    mietentwicklung: 0,
    wertentwicklung: 0,
  };
}

export function calculateWishlistRowKpis(
  row: WishlistProperty,
  g: WishlistGlobalAssumptions
): WishlistRowKpis {
  const kaufpreis = row.kaufpreis ?? 0;
  const wohnflaeche = row.wohnflaeche ?? 0;
  const kaltmiete = row.kaltmiete ?? 0;
  const eigenanteil =
    row.eigenanteil ?? (kaufpreis * g.defaultEigenanteilPct) / 100;

  const pricePerSqm =
    kaufpreis > 0 && wohnflaeche > 0 ? kaufpreis / wohnflaeche : null;

  if (kaufpreis <= 0) {
    return {
      pricePerSqm,
      mietrendite: null,
      monthlyCashFlow: null,
      ekRendite: null,
    };
  }

  if (kaltmiete <= 0) {
    return {
      pricePerSqm,
      mietrendite: null,
      monthlyCashFlow: null,
      ekRendite: null,
    };
  }

  // Monthly costs as % of cold rent
  const monthlyLeerstand = (kaltmiete * g.leerstandPct) / 100;
  const monthlyRuecklagen = (kaltmiete * g.ruecklagenPctOfMiete) / 100;
  const monthlyNichtUml = (kaltmiete * g.nichtUmlagefaehigPctOfMiete) / 100;

  // Yield: Brutto = Kaltmiete×12 / Kaufpreis. Netto subtracts the running costs.
  const grossAnnualRent = kaltmiete * 12;
  const netAnnualRent =
    grossAnnualRent -
    12 * (monthlyLeerstand + monthlyRuecklagen + monthlyNichtUml);
  const mietrendite =
    (g.yieldMode === "netto" ? netAnnualRent : grossAnnualRent) / kaufpreis * 100;

  // Mortgage
  const mortgage = calculateMortgage(mortgageInputsFor(row, g));
  const monthlyRate = mortgage.monthlyPayment;

  // Cashflow: Kaltmiete – Rate – [optional subtractions]
  const cf = g.cashflowSettings;
  const monthlyCashFlow =
    kaltmiete -
    monthlyRate -
    (cf.subtractVacancy ? monthlyLeerstand : 0) -
    (cf.subtractReserves ? monthlyRuecklagen : 0) -
    (cf.subtractNonAllocable ? monthlyNichtUml : 0);

  // EK-Rendite: (annualCashflow + [optional Tilgung]) / total invested capital
  const nebenkostenAbsolut = kaufpreis * (row.nebenkostenPct / 100);
  const totalCapital = eigenanteil + nebenkostenAbsolut;
  let ekRendite: number | null = null;
  if (totalCapital > 0) {
    const annualCashFlow = monthlyCashFlow * 12;
    const initialBalance = mortgage.loanAmount;
    const afterY1Balance = mortgage.schedule[0]?.balance ?? initialBalance;
    const tilgungY1 = initialBalance - afterY1Balance;
    const numerator =
      annualCashFlow + (g.ekReturnSettings.includeTilgung ? tilgungY1 : 0);
    ekRendite = (numerator / totalCapital) * 100;
  }

  return {
    pricePerSqm,
    mietrendite,
    monthlyCashFlow,
    ekRendite,
  };
}
