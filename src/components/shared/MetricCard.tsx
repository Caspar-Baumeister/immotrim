"use client";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
  accent?: string;
};

export function MetricCard({
  label,
  value,
  delta,
  deltaPositive,
  className,
  accent,
}: Props) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 flex flex-col gap-1 min-w-0",
        className
      )}
    >
      <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
        {label}
      </span>
      <span
        className="text-xl font-semibold tabular-nums truncate"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      {delta && (
        <span
          className={cn(
            "text-xs font-medium",
            deltaPositive ? "text-emerald-400" : "text-red-400"
          )}
        >
          {deltaPositive ? "+" : ""}
          {delta}
        </span>
      )}
    </div>
  );
}
