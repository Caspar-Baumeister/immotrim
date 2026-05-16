import type { PropertyInputs } from "@/lib/supabase";

export type AmortizationYear = {
  year: number;
  calendarYear: number;
  principal: number;
  interest: number;
  balance: number;
  totalPaid: number;
};

export type AmortizationMonth = {
  monthIndex: number; // global 1-based month number
  month: number;      // 1–12
  year: number;
  calendarYear: number;
  principal: number;
  interest: number;
  balance: number;
  totalPaid: number;
};

export type MortgageMetrics = {
  loanAmount: number;
  monthlyPayment: number;
  totalYears: number;
  totalInterestPaid: number;
  zinsbindung: number;
  ltv: number;
  schedule: AmortizationYear[];
  monthlySchedule: AmortizationMonth[];
};

export function calculateMortgage(inputs: PropertyInputs): MortgageMetrics {
  const D = Math.max(0, inputs.kaufpreis - inputs.eigenanteil);
  const r = inputs.zins / 100 / 12;
  // German Annuitätendarlehen: monthly payment = D × (zins% + tilgung%) / 12
  const A = D > 0 ? D * (inputs.zins / 100 + inputs.tilgung / 100) / 12 : 0;

  // Calculate full payoff term: n = -ln(1 - D×r/A) / ln(1+r)
  let totalMonths = 0;
  if (D <= 0 || A <= 0) {
    totalMonths = 0;
  } else if (r === 0) {
    totalMonths = D / A;
  } else {
    const ratio = (D * r) / A;
    if (ratio >= 1) {
      // Tilgung too low — cap at 50 years
      totalMonths = 600;
    } else {
      totalMonths = -Math.log(1 - ratio) / Math.log(1 + r);
    }
  }

  const totalYears = Math.max(1, Math.ceil(totalMonths / 12));
  const ltv = inputs.kaufpreis > 0 ? (D / inputs.kaufpreis) * 100 : 0;

  const startYear = inputs.loanStartDate
    ? parseInt(inputs.loanStartDate.split("-")[0], 10)
    : new Date().getFullYear();

  const schedule: AmortizationYear[] = [];
  const monthlySchedule: AmortizationMonth[] = [];
  let balance = D;
  let totalPaid = 0;
  let monthIndex = 0;

  for (let year = 1; year <= totalYears; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let month = 1; month <= 12; month++) {
      if (balance <= 0.01) break;
      const interest = balance * r;
      const principal = Math.min(A - interest, balance);
      if (principal < 0) break; // payment doesn't cover interest
      yearInterest += interest;
      yearPrincipal += principal;
      balance = Math.max(0, balance - principal);
      totalPaid += principal + interest;
      monthIndex++;

      monthlySchedule.push({
        monthIndex,
        month,
        year,
        calendarYear: startYear + year - 1,
        principal,
        interest,
        balance: Math.max(0, balance),
        totalPaid,
      });
    }

    schedule.push({
      year,
      calendarYear: startYear + year - 1,
      principal: yearPrincipal,
      interest: yearInterest,
      balance: Math.max(0, balance),
      totalPaid,
    });
  }

  const totalInterestPaid = schedule.reduce((sum, y) => sum + y.interest, 0);

  return {
    loanAmount: D,
    monthlyPayment: A,
    totalYears,
    totalInterestPaid,
    zinsbindung: inputs.zinsbindung,
    ltv,
    schedule,
    monthlySchedule,
  };
}
