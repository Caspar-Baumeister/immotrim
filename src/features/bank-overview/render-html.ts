import type { BankOverview, BankOverviewRow } from "./overview";

// Self-contained HTML for the bank overview (A4 landscape). Used for the
// in-app preview and, through headless Chrome, for the PDF.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const eur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(v));
const pct = (v: number, d = 1) =>
  `${v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const num = (v: number, d = 0) => v.toLocaleString("de-DE", { maximumFractionDigits: d });

function date(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d ? `${d}.${m}.${y}` : m ? `${m}/${y}` : y;
}

function details(r: BankOverviewRow): string {
  const parts = [
    r.type,
    r.livingArea ? `${num(r.livingArea)} m²` : null,
    r.yearBuilt ? `Bj. ${r.yearBuilt}` : null,
  ].filter(Boolean) as string[];
  return parts.map(esc).join(" · ");
}

function row(r: BankOverviewRow): string {
  return `<tr>
    <td><div class="obj">${esc(r.name)}</div>
      ${r.address ? `<div class="sub">${esc(r.address)}</div>` : ""}
      ${details(r) ? `<div class="sub">${details(r)}</div>` : ""}</td>
    <td class="n">${eur(r.purchasePrice)}${r.purchaseDate ? `<div class="sub">${date(r.purchaseDate)}</div>` : ""}</td>
    <td class="n">${eur(r.marketValue)}${r.marketValueIsEstimate ? "*" : ""}</td>
    <td class="n">${eur(r.loanBalance)}</td>
    <td class="n">${pct(r.ltvPct, 0)}</td>
    <td class="n">${r.loanBalance > 0 ? pct(r.interestPct, 2) : "ohne Kredit"}${r.fixedUntil ? `<div class="sub">bis ${r.fixedUntil}</div>` : ""}</td>
    <td class="n">${eur(r.monthlyRent)}</td>
    <td class="n">${eur(r.monthlyPayment)}</td>
    <td class="n ${r.monthlyCashFlow < 0 ? "neg" : ""}">${eur(r.monthlyCashFlow)}</td>
  </tr>`;
}

export function renderBankOverviewHtml(o: BankOverview): string {
  const t = o.totals;
  const tiles: [string, string][] = [
    ["Objekte", num(t.count)],
    ["Marktwert gesamt", eur(t.marketValue)],
    ["Restschuld gesamt", eur(t.loanBalance)],
    ["Eigenkapital im Bestand", eur(t.equity)],
    ["Beleihungsauslauf", pct(t.ltvPct)],
    ["Ø Zinssatz", t.loanBalance > 0 ? pct(t.avgInterestPct, 2) : "ohne Kredit"],
    ["Jahreskaltmiete", eur(t.annualRent)],
    ["Kapitaldienst p. a.", eur(t.annualDebtService)],
    ["Kapitaldienstdeckung", t.dscr != null ? `${num(t.dscr, 2)}×` : "ohne Kredit"],
    ["Bruttomietrendite", pct(t.grossYieldPct)],
    ["Cashflow p. a. vor Steuern", eur(t.annualCashFlow)],
    ["Wohnfläche gesamt", t.livingArea > 0 ? `${num(t.livingArea)} m²` : "nicht angegeben"],
  ];
  const hasEstimate = o.rows.some((r) => r.marketValueIsEstimate);

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Portfolioübersicht</title>
<style>
  @page { size: A4 landscape; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111827; font-size: 10.5px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 1060px; margin: 0 auto; padding: 8px 4px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #6c5ce7; padding-bottom: 10px; margin-bottom: 16px; }
  .brand { font-weight: 800; letter-spacing: .12em; color: #6c5ce7; font-size: 11px; }
  h1 { margin: 2px 0 0; font-size: 22px; letter-spacing: -.01em; }
  .meta { text-align: right; color: #4b5563; font-size: 10.5px; }
  .meta strong { color: #111827; }
  .tiles { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 18px; }
  .tile { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; background: #fafafb; }
  .tile .l { color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; }
  .tile .v { font-size: 14px; font-weight: 700; margin-top: 2px; font-variant-numeric: tabular-nums; }
  h2 { font-size: 12px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: .06em; color: #374151; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; font-weight: 600; border-bottom: 1px solid #d1d5db; padding: 6px 6px; }
  th.n, td.n { text-align: right; }
  td { border-bottom: 1px solid #eef0f3; padding: 7px 6px; vertical-align: top; font-variant-numeric: tabular-nums; }
  tr { page-break-inside: avoid; }
  .obj { font-weight: 600; }
  .sub { color: #6b7280; font-size: 9.5px; }
  .neg { color: #b91c1c; }
  tfoot td { font-weight: 700; border-top: 1.5px solid #9ca3af; border-bottom: none; }
  .notes { margin-top: 14px; color: #6b7280; font-size: 9px; line-height: 1.5; }
</style></head><body><div class="page">
<header>
  <div><div class="brand">IMMOTRIM</div><h1>Portfolioübersicht</h1></div>
  <div class="meta">${o.owner ? `<div><strong>${esc(o.owner)}</strong></div>` : ""}<div>Stand: ${date(o.asOf)}</div></div>
</header>
<section class="tiles">${tiles.map(([l, v]) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div></div>`).join("")}</section>
<h2>Objekte</h2>
<table>
  <thead><tr>
    <th>Objekt</th><th class="n">Kaufpreis</th><th class="n">Marktwert</th><th class="n">Restschuld</th>
    <th class="n">Beleihung</th><th class="n">Zins</th><th class="n">Kaltmiete mtl.</th><th class="n">Rate mtl.</th><th class="n">Cashflow mtl.</th>
  </tr></thead>
  <tbody>${o.rows.map(row).join("")}</tbody>
  <tfoot><tr>
    <td>Summe</td>
    <td class="n">${eur(o.rows.reduce((s, r) => s + r.purchasePrice, 0))}</td>
    <td class="n">${eur(t.marketValue)}</td>
    <td class="n">${eur(t.loanBalance)}</td>
    <td class="n">${pct(t.ltvPct, 0)}</td>
    <td class="n">${t.loanBalance > 0 ? pct(t.avgInterestPct, 2) : ""}</td>
    <td class="n">${eur(t.annualRent / 12)}</td>
    <td class="n">${eur(t.annualDebtService / 12)}</td>
    <td class="n ${t.annualCashFlow < 0 ? "neg" : ""}">${eur(t.annualCashFlow / 12)}</td>
  </tr></tfoot>
</table>
<div class="notes">
  ${hasEstimate ? "* Marktwert nach Schätzung des Eigentümers. Sonst Kaufpreis, fortgeschrieben mit der angenommenen Wertentwicklung.<br>" : "Marktwert: Kaufpreis, fortgeschrieben mit der angenommenen Wertentwicklung.<br>"}
  Restschuld zum Stichtag berechnet aus Darlehensbetrag, Sollzins, Tilgung und Darlehensbeginn. Cashflow: Kaltmiete abzüglich Leerstand, nicht umlagefähiger Kosten, Rücklagen sowie Zins und Tilgung, vor Steuern.
  Kapitaldienstdeckung: Mietüberschuss vor Kapitaldienst geteilt durch Zins und Tilgung.<br>
  Alle Angaben beruhen auf den Angaben und Unterlagen des Eigentümers. Erstellt mit Immotrim.
</div>
</div></body></html>`;
}
