"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { REPORT_COLORS, eurCompact } from "../report-theme";

// Light-mode, print-friendly chart primitives for the bank report. Deliberately
// minimal: thin grid, muted axes, dark legend, no animation (Chromium prints a
// single deterministic frame).

export type LineSeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  area?: boolean; // render as a faint filled area instead of a plain line
};

type AxisFmt = (v: number) => string;

const axisTick = { fontSize: 10, fill: REPORT_COLORS.axis };

function Legend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
      {series.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2.5 rounded-sm"
            style={{ background: s.color }}
          />
          <span className="text-[10px]" style={{ color: REPORT_COLORS.muted }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function TooltipBox({
  active,
  payload,
  label,
  valueFmt,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  valueFmt: AxisFmt;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border bg-white px-2.5 py-1.5 shadow-sm"
      style={{ borderColor: REPORT_COLORS.border }}
    >
      <p className="text-[10px] font-medium mb-0.5" style={{ color: REPORT_COLORS.text }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px]">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: p.color }}
          />
          <span style={{ color: REPORT_COLORS.muted }}>{p.name}</span>
          <span className="ml-auto font-medium tabular-nums" style={{ color: REPORT_COLORS.text }}>
            {valueFmt(p.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportLineChart({
  data,
  xKey,
  series,
  height = 200,
  valueFmt = eurCompact,
}: {
  data: Record<string, number>[];
  xKey: string;
  series: LineSeries[];
  height?: number;
  valueFmt?: AxisFmt;
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke={REPORT_COLORS.grid}
            vertical={false}
            horizontal
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey={xKey}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: REPORT_COLORS.grid }}
            minTickGap={24}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={valueFmt}
          />
          <Tooltip content={<TooltipBox valueFmt={valueFmt} />} />
          {series.map((s) =>
            s.area ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.1}
                isAnimationActive={false}
                dot={false}
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                isAnimationActive={false}
                dot={false}
              />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <Legend series={series} />
    </div>
  );
}

export type BarSeries = { key: string; label: string; color: string };

export function ReportBarChart({
  data,
  xKey,
  series,
  stacked = false,
  height = 200,
  valueFmt = eurCompact,
  withZeroLine = false,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  series: BarSeries[];
  stacked?: boolean;
  height?: number;
  valueFmt?: AxisFmt;
  withZeroLine?: boolean;
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke={REPORT_COLORS.grid}
            vertical={false}
            horizontal
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey={xKey}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: REPORT_COLORS.grid }}
            minTickGap={20}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={valueFmt}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={<TooltipBox valueFmt={valueFmt} />}
          />
          {withZeroLine && <ReferenceLine y={0} stroke={REPORT_COLORS.axis} />}
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "stack" : undefined}
              isAnimationActive={false}
              radius={stacked ? 0 : [2, 2, 0, 0]}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      {series.length > 1 && <Legend series={series} />}
    </div>
  );
}

// Horizontal bar chart for "per object" comparisons (property names on the y-axis).
export function ReportObjectBarChart({
  data,
  height,
  valueFmt = eurCompact,
  color = REPORT_COLORS.value,
  signed = false,
}: {
  data: { name: string; value: number }[];
  height?: number;
  valueFmt?: AxisFmt;
  color?: string;
  signed?: boolean; // colour negative values red (e.g. cash flow)
}) {
  const h = height ?? Math.max(80, data.length * 26 + 24);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <ComposedChart
        layout="vertical"
        data={data}
        margin={{ top: 2, right: 12, left: 0, bottom: 2 }}
      >
        <CartesianGrid
          stroke={REPORT_COLORS.grid}
          horizontal={false}
          vertical
          strokeDasharray="3 3"
        />
        <XAxis
          type="number"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickFormatter={valueFmt}
          tickCount={5}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: REPORT_COLORS.text }}
          tickLine={false}
          axisLine={false}
          width={120}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={<TooltipBox valueFmt={valueFmt} />}
        />
        {signed && <ReferenceLine x={0} stroke={REPORT_COLORS.axis} />}
        <Bar dataKey="value" name="Wert" isAnimationActive={false} radius={[0, 2, 2, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={signed && d.value < 0 ? REPORT_COLORS.cashflowNeg : color}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
