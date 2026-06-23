// Static domain knowledge injected into the chat system prompt. It teaches the
// model what each KPI and chart means, the exact formulas the app uses, and the
// calculation methodology — so it interprets terms correctly and can reason about
// scenarios. It must stay in sync with the calculation modules under
// src/features/*/calculations.ts (see calculatePortfolioKpis in
// src/features/portfolio/calculations.ts for the KPI formulas).
//
// All monetary values are euros; rates are plain-number percentages. Figures are a
// current/year-1 snapshot unless stated otherwise.
export const KNOWLEDGE_BASE = `immotrim knowledge base — definitions, formulas, charts, methodology.

KPI definitions & formulas (these match the \`metrics\` blocks you are given; never recompute them, use the given values):
- investedEquity (Eingesetztes Eigenkapital): eigenanteil + Kaufnebenkosten (Grunderwerbsteuer + Notar/Grundbuch + Makler + sonstige). This is the cash actually put in.
- totalInvestment (Gesamtinvestition): Kaufpreis + Kaufnebenkosten.
- currentValue (Immobilienwert): kaufpreis × (1 + wertentwicklung%)^(years since loanStartDate).
- remainingDebt (Restschuld): current balance from the annuity loan schedule.
- equity (Eigenkapital / Nettovermögen): currentValue − remainingDebt.
- ltvPct (Beleihungsauslauf): remainingDebt / currentValue × 100.
- annualColdRent: kaltmiete × 12.
- annualDebtService (Annuität / Rate p.a.): monthly payment × 12 = interest + principal.
- annualCashFlow / monthlyCashFlow (Cashflow VOR Steuern): annualColdRent − Leerstand − nicht-umlagefähige Kosten − Rücklagen − Zinsen − Tilgung. (The loan rate is included as interest + principal.)
- cashOnCashPct (Cash-on-Cash-Rendite): annualCashFlow / investedEquity × 100. The pure cash return on the equity put in — excludes principal paydown and appreciation.
- equityReturnPct (Eigenkapitalrendite vor Steuern): (annualCashFlow + Tilgung) / investedEquity × 100. Like cash-on-cash but counts principal repayment as wealth gain.
- grossYieldPct (Brutto-Mietrendite): annualColdRent / kaufpreis × 100.
- netYieldPct (Netto-Mietrendite): (annualColdRent − nicht-umlagefähige Kosten) / totalInvestment × 100.
- wealthBuildupPerYear (Vermögensaufbau pro Jahr, year 1): Tilgung + Cashflow + Wertzuwachs. Wertzuwachs is the value gained that year (0 if wertentwicklung is 0%).
- weightedInterestRatePct / weightedRepaymentRatePct (portfolio only): average zins / tilgung weighted by outstanding balance.
- taxImpactPerYear (only if tax configured): annual tax effect (>0 = saving). steuerliches Ergebnis = Nettokaltmiete − AfA − Schuldzinsen − nicht-umlagefähige Kosten; effect = −Ergebnis × Grenzsteuersatz. AfA = gebäudeanteil-share of basis × afaPct.

Charts shown in the app (so you can explain them):
- Cashflow: yearly net cash flow after loan rate, reserves and non-recoverable costs; grows over time with Mietentwicklung.
- Tilgungsplan (amortization): yearly principal, interest and remaining balance until full repayment. Annuitätendarlehen = constant rate; interest share falls and principal share rises over time.
- Eigenkapitalrendite: yearly return on the equity put in; ends once cumulative cash returns have paid that equity back.
- Immobilienwert vs. Schulden: property value (compounded) versus remaining debt; the gap is equity.
- Brutto-Mietrendite: kaltmiete / kaufpreis over time, rising with Mietentwicklung.
- Vermögensaufbau: yearly wealth gain stacked as Tilgung + Cashflow + Wertzuwachs.

Calculation methodology (for explaining scenarios):
- Annuitätendarlehen: loan = kaufpreis − eigenanteil; constant monthly rate = loan × (zins% + tilgung%) / 12. Each month interest accrues on the remaining balance and the rest repays principal, so the balance falls and the principal share grows. Higher tilgung → faster payoff and more wealth buildup, but a higher rate and lower cash flow.
- mietentwicklung / wertentwicklung are annual % assumptions that compound rent and value respectively.
- Levers: ↑zins → higher interest, lower cash flow; ↑kaltmiete → higher cash flow and yields; ↑eigenanteil → less debt/interest but more capital tied up (lower cash-on-cash); ↑afaPct or ↑steuersatz → larger tax saving.

Scenario rule: explain what-if questions qualitatively using these relationships and the levers above. Do NOT fabricate exact projected numbers for a changed input — only the app can run a full projection. State the direction and which KPIs move, and offer that the user change the value (you can propose it) to see the recomputed figures.`;
