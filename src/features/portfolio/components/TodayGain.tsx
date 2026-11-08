import type { DailyGain } from "@/features/portfolio/forces";

const cents = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

// "Heutiger Gewinn": the year's wealth forces as one day's figure, with the same
// rows and bars as the forces on the landing page.
export function TodayGain({ gain }: { gain: DailyGain }) {
  const rows = [
    { label: "Schuldenabbau (Tilgung)", value: gain.principal, color: "var(--chart-principal)" },
    { label: "Cashflow vor Steuern", value: gain.cashFlow, color: "var(--chart-cashflow)" },
    { label: "Wertsteigerung", value: gain.appreciation, color: "var(--chart-equity)" },
    { label: "Inflation auf die Schulden", value: gain.inflationOnDebt, color: "var(--chart-returns)" },
  ];
  const largest = Math.max(...rows.map((r) => Math.abs(r.value)), 0.01);

  return (
    <section className="bg-card border border-border rounded-xl p-5 md:p-6 grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:gap-10 lg:items-center">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink)]">Heutiger Gewinn</h3>
        <p
          className={`mt-2 text-[40px] font-bold leading-none tracking-[-0.035em] tabular-nums md:text-[52px] ${
            gain.total < 0 ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {cents.format(gain.total)}
        </p>
        <p className="mt-4 max-w-[420px] text-xs leading-relaxed text-muted-foreground">
          Rechnerisch: die Jahreswerte deiner Immobilien geteilt durch die Tage des Jahres. Aufs Konto fließt davon nur
          der Cashflow. Wertsteigerung und Inflation beruhen auf Annahmen.
        </p>
      </div>
      <div className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="truncate text-muted-foreground">{r.label}</span>
              <span className={`font-medium tabular-nums ${r.value < 0 ? "text-red-400" : "text-[var(--ink)]"}`}>
                {cents.format(r.value)}
              </span>
            </div>
            <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(Math.abs(r.value) / largest) * 100}%`,
                  background: r.value < 0 ? "#ef4444" : r.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
