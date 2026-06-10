"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Dense fact column ────────────────────────────────────────────────────────
// Shared between the single-property insights page and the portfolio KPI panel
// so both surfaces use the exact same dense, tooltip-annotated layout.

export type Fact = {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
  tooltip?: ReactNode;
};

export function FactColumn({ title, facts }: { title: string; facts: Fact[] }) {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border/50">
        {facts.map((fact, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2 gap-2"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <span className="truncate">{fact.label}</span>
              {fact.tooltip && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="text-muted-foreground/50 hover:text-muted-foreground flex-shrink-0"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    }
                  />
                  <TooltipContent
                    side="top"
                    className="max-w-[280px] text-left leading-snug"
                  >
                    {fact.tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                fact.highlight && fact.positive === true && "text-emerald-400",
                fact.highlight && fact.positive === false && "text-red-400",
                fact.highlight && fact.positive === undefined && "text-amber-400",
                fact.negative && !fact.highlight && "text-red-400/80",
                fact.muted && "text-muted-foreground",
                !fact.highlight && !fact.negative && !fact.muted && "text-foreground"
              )}
            >
              {fact.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
