"use client";

import { Building2, Landmark, LayoutDashboard, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { VermoegensaufbauChart } from "@/features/wealth/components/VermoegensaufbauChart";
import { CHART_SHOWCASE_DATA } from "@/components/marketing/chart-showcase-data";

import { DEMO_FORCES, DEMO_KPIS, DEMO_PROPERTIES, eur } from "./demo";

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const WEALTH = CHART_SHOWCASE_DATA.wealth.slice(0, 16);
const MAX_FORCE = Math.max(...DEMO_FORCES.map((f) => f.value));

/** Seconds since the window appeared, so numbers count up once after the headline. */
function useClock(delayMs: number, durationMs: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = reduced ? now - durationMs : now + delayMs;
      const elapsed = Math.max(0, now - start);
      setT(elapsed / 1000);
      if (elapsed < durationMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [delayMs, durationMs]);
  return t;
}

/**
 * The Immotrim dashboard in a window, with the demo portfolio: the KPIs count
 * up, the forces fill in one after another, then the chart grows.
 */
export function HeroWindow() {
  const t = useClock(700, 3200);
  const count = easeOut(t / 1.4);
  const nav = [
    { icon: LayoutDashboard, label: "Übersicht", active: true },
    { icon: Building2, label: "Immobilien" },
    { icon: Landmark, label: "Bankenübersicht" },
  ];
  const kpis = [
    { label: "Marktwert", value: eur(DEMO_KPIS.marketValue * count) },
    { label: "Restschuld", value: eur(DEMO_KPIS.debt * count) },
    { label: "Vermögenszuwachs pro Jahr", value: `+${eur(DEMO_KPIS.growth * count)}`, tone: "text-emerald-400" },
    {
      label: "Eigenkapitalrendite",
      value: `${(DEMO_KPIS.leveredReturnPct * count).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`,
      tone: "text-[var(--violet)]",
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[#1b1b1b] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
      {/* Title bar */}
      <div className="flex h-10 items-center gap-2 border-b border-border px-4">
        <span className="h-3 w-3 rounded-full bg-white/10" />
        <span className="h-3 w-3 rounded-full bg-white/10" />
        <span className="h-3 w-3 rounded-full bg-white/10" />
        <div className="mx-auto rounded-md bg-white/5 px-3 py-0.5 text-[11px] text-[var(--faint)]">immotrim.com/dashboard</div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] text-muted-foreground">C</span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border p-3 md:flex">
          <div className="mb-3 flex items-center gap-2 px-2 pt-1 text-sm font-semibold text-[var(--ink)]">
            <Image src="/logo_immotrim.svg" alt="" width={18} height={18} />
            Immotrim
          </div>
          {nav.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${active ? "bg-white/[0.07] text-[var(--ink)]" : "text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </div>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[var(--violet)]">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            Immotrim Plus
          </div>
        </aside>

        {/* Dashboard */}
        <div className="min-w-0 flex-1 space-y-4 p-4 md:p-6">
          <div>
            <div className="text-lg font-semibold tracking-[-0.01em] text-[var(--ink)]">Übersicht</div>
            <div className="text-xs text-[var(--faint)]">3 Immobilien, Stand heute</div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-lg border border-border bg-card p-3">
                <div className="truncate text-[11px] text-muted-foreground">{k.label}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums tracking-[-0.01em] md:text-xl ${k.tone ?? "text-[var(--ink)]"}`}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1.15fr]">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[13px] font-semibold text-[var(--ink)]">Was dein Vermögen gerade bewegt</div>
              <div className="mb-3 text-[11px] text-[var(--faint)]">Alle Kräfte für dieses Jahr</div>
              <div className="space-y-2.5">
                {DEMO_FORCES.map((f, i) => {
                  const p = easeOut((t - 0.5 - i * 0.18) / 0.8);
                  return (
                    <div key={f.key} className="text-[12px]">
                      <div className="flex justify-between gap-3">
                        <span className="truncate text-muted-foreground">{f.label}</span>
                        <span className="font-medium tabular-nums text-[var(--ink)]">+{eur(f.value * p)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${(f.value / MAX_FORCE) * 100 * p}%`, background: f.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[11px]">
                {DEMO_PROPERTIES.map((o) => (
                  <div key={o.name} className="min-w-0">
                    <div className="truncate text-[var(--ink)]">{o.name}</div>
                    <div className="truncate text-[var(--faint)]">{eur(o.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden rounded-lg border border-border bg-card p-4 sm:block">
              <div className="text-[13px] font-semibold text-[var(--ink)]">Vermögensaufbau pro Jahr</div>
              <div className="mb-2 text-[11px] text-[var(--faint)]">Tilgung, Cashflow und Wertsteigerung</div>
              <div className="h-[230px]">{t > 1.1 ? <VermoegensaufbauChart data={WEALTH} height={230} /> : null}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
