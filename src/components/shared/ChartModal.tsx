"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type StatItem = {
  label: string;
  value: string;
  positive?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  stats?: StatItem[];
  children: React.ReactNode;
};

export function ChartModal({ open, onClose, title, subtitle, stats, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl sm:max-w-6xl w-[95vw] bg-popover border-border p-0 overflow-hidden">
        <div className="flex flex-col overflow-hidden" style={{ height: "85vh" }}>
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </DialogHeader>

          {/* Chart — explicit calc height so ResponsiveContainer height="100%" works */}
          <div
            className="px-6 pt-4 pb-2 flex-shrink-0"
            style={{ height: stats && stats.length > 0 ? "calc(85vh - 130px)" : "calc(85vh - 80px)" }}
          >
            <div style={{ width: "100%", height: "100%" }}>{children}</div>
          </div>

          {/* Stats footer */}
          {stats && stats.length > 0 && (
            <div className="px-6 py-3 border-t border-border flex-shrink-0 flex items-center gap-2 flex-wrap">
              {stats.map((stat, i) => (
                <Badge
                  key={`${stat.label}-${i}`}
                  variant="secondary"
                  className={
                    stat.positive === true
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs"
                      : stat.positive === false
                      ? "bg-red-500/10 text-red-400 border border-red-500/20 text-xs"
                      : "bg-muted text-muted-foreground text-xs"
                  }
                >
                  {stat.label}: {stat.value}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
