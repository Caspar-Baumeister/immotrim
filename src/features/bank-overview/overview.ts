import { calculateMortgage, currentLoanState } from "@/features/mortgage/calculations";
import type { Property } from "@/lib/types";

// The bank overview: the portfolio as it stands today, per property and in
// total. No projections, no charts; every figure is a current value a bank can
// check against the owner's documents.

export type BankOverviewRow = {
  name: string;
  address: string | null;
  type: string | null;
  livingArea: number | null;
  yearBuilt: number | null;
  purchaseDate: string | null; // "YYYY-MM-DD" or "YYYY-MM"
  purchasePrice: number;
  marketValue: number; // owner's estimate, else purchase price with its appreciation
  marketValueIsEstimate: boolean; // true when the owner entered it
  loanBalance: number;
  ltvPct: number;
  interestPct: number;
  fixedUntil: number | null; // calendar year the fixed rate ends
  monthlyRent: number; // cold rent
  monthlyPayment: number; // interest + principal
  monthlyCosts: number; // non-recoverable costs + Hausgeld share not passed on + reserves
  monthlyCashFlow: number;
};

export type BankOverview = {
  asOf: string; // ISO date
  owner: string | null;
  rows: BankOverviewRow[];
  totals: {
    count: number;
    marketValue: number;
    loanBalance: number;
    equity: number;
    ltvPct: number;
    annualRent: number;
    annualDebtService: number;
    annualCashFlow: number;
    avgInterestPct: number; // weighted by loan balance
    grossYieldPct: number; // annual rent / purchase prices
    dscr: number | null; // (rent − costs) / debt service
    livingArea: number;
  };
};

function monthsBetween(fromYYYYMM: string, now: Date): number {
  const [y, m] = fromYYYYMM.split("-").map((v) => parseInt(v, 10));
  if (!y || !m) return 0;
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

export function buildBankOverview(properties: Property[], owner: string | null, now = new Date()): BankOverview {
  const rows: BankOverviewRow[] = properties.map((p) => {
    const i = p.inputs;
    const mortgage = calculateMortgage(i);
    const elapsed = i.loanStartDate ? monthsBetween(i.loanStartDate, now) : 0;
    const loanBalance = currentLoanState(i, mortgage, now).balance;
    const elapsedYears = Math.max(0, elapsed / 12);
    const projected = i.kaufpreis * Math.pow(1 + (i.wertentwicklung ?? 0) / 100, Math.floor(elapsedYears));
    const marketValue = i.report?.marktwert ?? projected;
    const startYear = i.loanStartDate ? parseInt(i.loanStartDate.slice(0, 4), 10) : null;
    const monthlyCosts = i.nichtUmlagefaehig + i.ruecklagen + i.kaltmiete * (i.leerstand / 100);
    const paying = loanBalance > 0.5;
    return {
      name: p.name,
      address: p.address,
      type: i.report?.objekttyp ?? null,
      livingArea: i.report?.wohnflaeche ?? null,
      yearBuilt: i.report?.baujahr ?? null,
      purchaseDate: i.report?.kaufdatum ?? i.loanStartDate ?? null,
      purchasePrice: i.kaufpreis,
      marketValue,
      marketValueIsEstimate: i.report?.marktwert != null,
      loanBalance: paying ? loanBalance : 0,
      ltvPct: marketValue > 0 ? ((paying ? loanBalance : 0) / marketValue) * 100 : 0,
      interestPct: paying ? i.zins : 0,
      fixedUntil: paying && startYear && i.zinsbindung ? startYear + i.zinsbindung : null,
      monthlyRent: i.kaltmiete,
      monthlyPayment: paying ? mortgage.monthlyPayment : 0,
      monthlyCosts,
      monthlyCashFlow: i.kaltmiete - monthlyCosts - (paying ? mortgage.monthlyPayment : 0),
    };
  });

  const sum = (f: (r: BankOverviewRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const marketValue = sum((r) => r.marketValue);
  const loanBalance = sum((r) => r.loanBalance);
  const annualRent = sum((r) => r.monthlyRent) * 12;
  const annualDebtService = sum((r) => r.monthlyPayment) * 12;
  const annualCosts = sum((r) => r.monthlyCosts) * 12;
  const purchase = sum((r) => r.purchasePrice);

  return {
    asOf: now.toISOString().slice(0, 10),
    owner,
    rows,
    totals: {
      count: rows.length,
      marketValue,
      loanBalance,
      equity: marketValue - loanBalance,
      ltvPct: marketValue > 0 ? (loanBalance / marketValue) * 100 : 0,
      annualRent,
      annualDebtService,
      annualCashFlow: annualRent - annualCosts - annualDebtService,
      avgInterestPct: loanBalance > 0 ? sum((r) => r.loanBalance * r.interestPct) / loanBalance : 0,
      grossYieldPct: purchase > 0 ? (annualRent / purchase) * 100 : 0,
      dscr: annualDebtService > 0 ? (annualRent - annualCosts) / annualDebtService : null,
      livingArea: sum((r) => r.livingArea ?? 0),
    },
  };
}
