"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { type WealthYear } from "../calculations";
import { formatCurrency } from "@/lib/utils";

type SegmentKey = "wertwachstum" | "cashFlow" | "tilgung";

type Segment = {
  key: SegmentKey;
  label: string;
  color: string;
};

// Render order = stacking order (bottom → top). Colors follow the app's
// existing language: Tilgung green, Cashflow amber, Wertwachstum blue.
const SEGMENTS: Segment[] = [
  { key: "tilgung", label: "Tilgung", color: "#22c55e" },
  { key: "cashFlow", label: "Cashflow", color: "#f59e0b" },
  { key: "wertwachstum", label: "Wertwachstum", color: "#3b82f6" },
];

type Props = {
  data: WealthYear[];
  /** Drop the Wertwachstum segment entirely when wertentwicklung is 0%. */
  showWertwachstum?: boolean;
  height?: number | `${number}%`;
};

const buildTooltip =
  (segments: Segment[]) =>
  ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0]?.payload as WealthYear;
    const visibleTotal = segments.reduce(
      (sum, s) => sum + (entry[s.key] as number),
      0
    );
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
        <p className="text-muted-foreground mb-1">{label}</p>
        {segments.map((s) => (
          <p key={s.key} style={{ color: s.color }}>
            {s.label}: {formatCurrency(entry[s.key] as number, "de-DE")}
          </p>
        ))}
        <p className="text-foreground font-semibold border-t border-border pt-0.5 mt-0.5 tabular-nums">
          Summe: {formatCurrency(visibleTotal, "de-DE")}
        </p>
      </div>
    );
  };

export function VermoegensaufbauChart({
  data,
  showWertwachstum = true,
  height = 220,
}: Props) {
  const isFullscreen = typeof height === "string";

  const segments = SEGMENTS.filter(
    (s) => s.key !== "wertwachstum" || showWertwachstum
  );

  // Toggled-off segments — clicking a legend chip crosses it out and removes
  // it from the stack (like the reference KPI chart).
  const [hidden, setHidden] = useState<Set<SegmentKey>>(new Set());
  const toggle = (key: SegmentKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const visibleSegments = segments.filter((s) => !hidden.has(s.key));

  return (
    <div className="flex flex-col h-full gap-1">
      {/* Interactive legend — toggle segments in/out of the stack */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {segments.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className="flex items-center gap-1.5 transition-opacity"
              style={{ opacity: off ? 0.4 : 1 }}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor: s.color,
                  opacity: 0.85,
                }}
              />
              <span
                className={`text-[10px] text-muted-foreground ${
                  off ? "line-through" : ""
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={isFullscreen ? "100%" : height}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: 0, bottom: isFullscreen ? 24 : 0 }}
            barSize={
              isFullscreen
                ? undefined
                : Math.max(4, Math.min(16, 320 / Math.max(data.length, 1)))
            }
            barCategoryGap={isFullscreen ? "18%" : "20%"}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--chart-grid)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="calendarYear"
              tick={{ fontSize: 10, fill: "#6b6b6b" }}
              tickLine={false}
              axisLine={false}
              interval={
                isFullscreen ? 0 : Math.max(0, Math.ceil(data.length / 6) - 1)
              }
              angle={isFullscreen ? -45 : 0}
              textAnchor={isFullscreen ? "end" : "middle"}
              height={isFullscreen ? 40 : undefined}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b6b6b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
              width={56}
            />
            <Tooltip
              content={buildTooltip(visibleSegments)}
              cursor={{ fill: "var(--chart-cursor)" }}
            />
            <ReferenceLine y={0} stroke="var(--chart-reference)" strokeWidth={1} />
            {visibleSegments.map((s, idx) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="a"
                fill={s.color}
                fillOpacity={0.85}
                // Round only the topmost visible segment.
                radius={
                  idx === visibleSegments.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
