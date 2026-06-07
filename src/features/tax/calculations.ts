import type { PropertyInputs } from "@/lib/supabase";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";

export type TaxMetrics = {
  // Echoed inputs
  grenzsteuersatz: number;          // personal marginal tax rate %
  afaSatz: number;                  // annual depreciation rate %

  // AfA (depreciation)
  afaBemessungsgrundlage: number;   // depreciable building basis € (Bemessungsgrundlage × Gebäudeanteil)
  jaehrlicheAfa: number;            // annual depreciation €/year

  // Building blocks of the taxable result (year 1)
  nettoMieteY1: number;             // net cold rent after vacancy €/year
  schuldzinsenY1: number;           // deductible mortgage interest, year 1 €/year
  nichtUmlagefaehigY1: number;      // non-allocable operating costs €/year

  // Result
  steuerlichesErgebnis: number;     // taxable rental result € (negative = loss)
  steuerEffekt: number;             // tax effect € (positive = Steuerersparnis, negative = Steuerbelastung)

  // Cashflow & return after tax
  cashflowVorSteuern: number;       // pre-tax annual cashflow €/year
  cashflowNachSteuern: number;      // after-tax annual cashflow €/year
  cashOnCashVorSteuern: number;     // pre-tax cash-on-cash return %
  cashOnCashNachSteuern: number;    // after-tax cash-on-cash return %
};

/**
 * German rental-property income-tax effect (Einkünfte aus Vermietung und Verpachtung),
 * computed for year 1.
 *
 * Steuerliches Ergebnis = Netto-Kaltmiete − AfA − Schuldzinsen − nicht umlagefähige Kosten.
 * Tilgung (principal) is NOT deductible; AfA is a non-cash deduction. Maintenance reserves
 * (Rücklagen) are deliberately excluded — they are only deductible once actually spent.
 *
 * A negative result lowers taxable income → Steuerersparnis = |Ergebnis| × Grenzsteuersatz.
 * A positive result is taxed → Steuerbelastung = Ergebnis × Grenzsteuersatz.
 */
export function calculateTax(inputs: PropertyInputs): TaxMetrics | null {
  if (!inputs.tax) return null;

  const { gebaeudeanteilPct, bemessungsgrundlage, steuersatz } = inputs.tax;
  // Fallback for tax objects saved before afaPct existed (2% = standard Bestand).
  const afaPct = inputs.tax.afaPct ?? 2;

  const cashFlow = calculateCashFlow(inputs);
  const mortgage = calculateMortgage(inputs);

  // AfA — only the building share of the basis is depreciable (land is not).
  const afaBemessungsgrundlage = bemessungsgrundlage * (gebaeudeanteilPct / 100);
  const jaehrlicheAfa = afaBemessungsgrundlage * (afaPct / 100);

  // Year-1 building blocks
  const nettoMieteY1 = cashFlow.years[0]?.netRent ?? 0;
  const schuldzinsenY1 = mortgage.schedule[0]?.interest ?? 0;
  const nichtUmlagefaehigY1 = inputs.nichtUmlagefaehig * 12;

  const steuerlichesErgebnis =
    nettoMieteY1 - jaehrlicheAfa - schuldzinsenY1 - nichtUmlagefaehigY1;

  // Positive tax effect = saving (loss reduces other taxable income),
  // negative = additional tax burden.
  const steuerEffekt = -steuerlichesErgebnis * (steuersatz / 100);

  const cashflowVorSteuern = cashFlow.annualCashFlow;
  const cashflowNachSteuern = cashflowVorSteuern + steuerEffekt;

  const cashOnCashVorSteuern =
    inputs.eigenanteil > 0
      ? (cashflowVorSteuern / inputs.eigenanteil) * 100
      : 0;
  const cashOnCashNachSteuern =
    inputs.eigenanteil > 0
      ? (cashflowNachSteuern / inputs.eigenanteil) * 100
      : 0;

  return {
    grenzsteuersatz: steuersatz,
    afaSatz: afaPct,
    afaBemessungsgrundlage,
    jaehrlicheAfa,
    nettoMieteY1,
    schuldzinsenY1,
    nichtUmlagefaehigY1,
    steuerlichesErgebnis,
    steuerEffekt,
    cashflowVorSteuern,
    cashflowNachSteuern,
    cashOnCashVorSteuern,
    cashOnCashNachSteuern,
  };
}
