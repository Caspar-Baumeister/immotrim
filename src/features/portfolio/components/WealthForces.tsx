"use client";

import { Info, TrendingUp, Wallet, Landmark, ArrowDownRight, Percent, Home, Scale } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  ASSUMED_INFLATION_PCT,
  REFINANCE_LTV_PCT,
  type WealthForces as Forces,
} from "@/features/portfolio/forces";

const eur = (v: number) => formatCurrency(Math.round(v), "de-DE");

type Row = {
  icon: typeof Wallet;
  label: string;
  value: number;
  hint: string;
};

// "Was dein Vermögen gerade bewegt": every force in euros per year, so the
// portfolio reads like a depot statement instead of a rent-minus-rate sum.
export function WealthForces({ forces }: { forces: Forces }) {
  const rows: Row[] = [
    {
      icon: ArrowDownRight,
      label: "Schuldenabbau (Tilgung)",
      value: forces.principal,
      hint: "So viel Restschuld zahlst du dieses Jahr mit der Rate ab. Das ist Vermögen, das du nicht auf dem Konto siehst.",
    },
    {
      icon: Wallet,
      label: "Cashflow vor Steuern",
      value: forces.cashFlow,
      hint: "Miete abzüglich Leerstand, nicht umlagefähiger Kosten, Rücklagen, Zins und Tilgung.",
    },
    {
      icon: TrendingUp,
      label: "Wertsteigerung",
      value: forces.appreciation,
      hint: "Heutiger Wert mal die erwartete Wertentwicklung pro Jahr, die du je Objekt hinterlegt hast.",
    },
    {
      icon: Percent,
      label: "Inflation auf die Schulden",
      value: forces.inflationOnDebt,
      hint: `Deine Restschuld bleibt nominal gleich, verliert aber an Kaufkraft. Bei ${ASSUMED_INFLATION_PCT} % Inflation ist das real ein Gewinn für dich.`,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">Was dein Vermögen gerade bewegt</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alle Kräfte deines Portfolios für dieses Jahr, nicht nur Miete minus Rate.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Vermögenszuwachs pro Jahr</p>
          <p className={`text-xl font-semibold tabular-nums tracking-[-0.01em] ${forces.total >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {forces.total >= 0 ? "+" : ""}{eur(forces.total)}
          </p>
        </div>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map((r) => (
            <ForceRow key={r.label} {...r} />
          ))}
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <Extra
          icon={Scale}
          label="Eigenkapitalhebel"
          value={formatPercent(forces.leveredReturnPct, 1)}
          note={`Rendite auf dein Eigenkapital. Ohne Kredit wären es ${formatPercent(forces.unleveredReturnPct, 1)}.`}
        />
        <Extra
          icon={Home}
          label="Mieterhöhung"
          value={forces.rentIncrease > 0 ? `+${eur(forces.rentIncrease)}` : eur(0)}
          note={forces.rentIncrease > 0
            ? "Zusätzliche Kaltmiete im nächsten Jahr nach deiner erwarteten Mietentwicklung."
            : "Hinterlege je Objekt eine erwartete Mietentwicklung, dann siehst du hier den Effekt."}
        />
        <Extra
          icon={Landmark}
          label="Nachbeleihung möglich"
          value={eur(forces.refinanceHeadroom)}
          note={`Freier Spielraum bis ${REFINANCE_LTV_PCT} % des heutigen Werts, etwa für das nächste Objekt.`}
        />
      </div>
    </div>
  );
}

function ForceRow({ icon: Icon, label, value, hint }: Row) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6c5ce7]/10">
        <Icon className="h-4 w-4 text-[var(--violet)]" />
      </span>
      <span className="flex-1 min-w-0 text-sm text-foreground flex items-center gap-1.5">
        <span className="truncate">{label}</span>
        <Tooltip>
          <TooltipTrigger className="inline-flex">
            <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] leading-snug">{hint}</TooltipContent>
        </Tooltip>
      </span>
      <span className={`text-sm font-semibold tabular-nums ${value < 0 ? "text-red-400" : "text-foreground"}`}>
        {value > 0 ? "+" : ""}{eur(value)}
      </span>
    </div>
  );
}

function Extra({ icon: Icon, label, value, note }: { icon: typeof Wallet; label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-base font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground leading-snug">{note}</span>
    </div>
  );
}
