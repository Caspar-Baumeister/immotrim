"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The moving 3D chart of the hero. three.js loads only after the page is up,
 * so it never holds back the headline. Without WebGL the box just stays empty.
 */
export function HeroGraph({ label, value }: { label: string; value: string }) {
  const box = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("./hero-graph-scene")
      .then(({ mountHeroGraph }) => {
        if (cancelled || !box.current) return;
        dispose = mountHeroGraph(box.current, {
          onReady: () => setReady(true),
          onPeak: (x, y, visible) => {
            if (!chip.current) return;
            chip.current.style.transform = `translate(${x}px, ${y}px)`;
            chip.current.style.opacity = visible ? "1" : "0";
          },
        });
      })
      .catch((e) => console.warn("[hero graph]", e));
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <div className={`relative h-full w-full transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
      <div ref={box} className="absolute inset-0" />
      <div ref={chip} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-500">
        <div className="-translate-x-[85%] -translate-y-[calc(100%+18px)] whitespace-nowrap rounded-lg border border-[var(--line-strong)] bg-[#141416]/85 px-3 py-2 backdrop-blur">
          <div className="text-[11px] leading-none text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-[15px] font-semibold leading-none tabular-nums text-emerald-400">{value}</div>
        </div>
      </div>
    </div>
  );
}
