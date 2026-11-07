"use client";

import { useEffect, useRef, useState } from "react";

import { DEMO_FORCES, DEMO_KPIS, eur } from "./demo";

const NAPKIN = 600;

/**
 * Napkin sum against the full picture: one thin bar for "Miete minus Rate",
 * then the forces fill a second bar one after another once it scrolls in.
 */
export function ForcesStack({ labels }: { labels: { napkin: string; napkinValue: string; immotrim: string; total: string; leverage: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{labels.napkin}</span>
        <span className="font-medium tabular-nums text-muted-foreground">{labels.napkinValue}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full bg-white/30 transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: shown ? `${(NAPKIN / DEMO_KPIS.growth) * 100}%` : "0%" }}
        />
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <span className="text-sm text-[var(--ink)]">{labels.immotrim}</span>
        <span className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-emerald-400 md:text-3xl">{labels.total}</span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-white/[0.05]">
        {DEMO_FORCES.map((f, i) => (
          <div
            key={f.key}
            className="h-full shrink-0 border-r-[3px] border-[var(--card)] transition-[width] duration-700 ease-out last:border-r-0 motion-reduce:transition-none"
            style={{ background: f.color, width: shown ? `${(f.value / DEMO_KPIS.growth) * 100}%` : "0%", transitionDelay: `${300 + i * 220}ms` }}
          />
        ))}
      </div>

      <ul className="mt-6 space-y-2.5">
        {DEMO_FORCES.map((f, i) => (
          <li
            key={f.key}
            className="flex items-center gap-3 text-sm transition-all duration-500 motion-reduce:transition-none"
            style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(6px)", transitionDelay: `${300 + i * 220}ms` }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.color }} />
            <span className="flex-1 text-muted-foreground">{f.label}</span>
            <span className="font-medium tabular-nums text-[var(--ink)]">+{eur(f.value)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-border pt-4 text-sm text-[var(--violet)]">{labels.leverage}</p>
    </div>
  );
}
