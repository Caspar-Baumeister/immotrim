"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartModal } from "./ChartModal";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  modalContent?: React.ReactNode;
  modalStats?: { label: string; value: string; positive?: boolean }[];
  className?: string;
  expandLabel?: string;
};

export function ChartCard({
  title,
  subtitle,
  badge,
  children,
  modalContent,
  modalStats,
  className,
  expandLabel = "Expand chart",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "bg-card border border-border rounded-xl p-5 flex flex-col gap-3",
          className
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {badge && (
              <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 uppercase tracking-wider flex-shrink-0">
                {badge}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            title={expandLabel}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-white/5"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </div>

      <ChartModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={subtitle}
        stats={modalStats}
      >
        {modalContent ?? children}
      </ChartModal>
    </>
  );
}
