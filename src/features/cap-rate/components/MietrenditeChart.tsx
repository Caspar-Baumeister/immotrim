"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { type MietrenditeYear, type MietrenditeMonth } from "../calculations";
import { formatPercent } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type Props = {
  data: MietrenditeYear[];
  monthlyData?: MietrenditeMonth[];
  baselineY1?: number; // horizontal reference line
  height?: number | `${number}%`;
  monthly?: boolean;
};

const CustomTooltipYearly = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value as number;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">Jahr {label}</p>
      <p className="text-orange-400 font-semibold">
        Brutto-Mietrendite: {formatPercent(value)}
      </p>
    </div>
  );
};

const CustomTooltipMonthly = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as MietrenditeMonth;
  const value = payload[0]?.value as number;
  const monthName = MONTH_NAMES[(entry.month ?? 1) - 1];
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{monthName} {entry.calendarYear}</p>
      <p className="text-orange-400 font-semibold">
        Brutto-Mietrendite: {formatPercent(value)}
      </p>
    </div>
  );
};

export function MietrenditeChart({ data, monthlyData, baselineY1, height = 220, monthly = false }: Props) {
  if (monthly && monthlyData && monthlyData.length > 0) {
    const yearStartTicks = monthlyData
      .filter((d) => d.month === 1)
      .map((d) => d.monthIndex);

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={monthlyData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="monthIndex"
            ticks={yearStartTicks}
            tickFormatter={(idx) => {
              const entry = monthlyData.find((d) => d.monthIndex === idx);
              return entry ? String(entry.calendarYear) : "";
            }}
            tick={{ fontSize: 10, fill: "#6b6b6b" }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b6b6b" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            width={40}
            domain={["auto", "auto"]}
          />
          <Tooltip
            content={<CustomTooltipMonthly />}
            cursor={{ stroke: "rgba(255,255,255,0.08)" }}
          />
          {baselineY1 !== undefined && (
            <ReferenceLine
              y={baselineY1}
              stroke="rgba(249,115,22,0.35)"
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{
                value: `Basis ${formatPercent(baselineY1, 1)}`,
                position: "insideTopRight",
                fontSize: 9,
                fill: "rgba(249,115,22,0.6)",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="bruttoMietrendite"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#f97316" }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Yearly mode (original)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          interval={Math.max(0, Math.ceil(data.length / 6) - 1)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v.toFixed(1)}%`}
          width={40}
          domain={["auto", "auto"]}
        />
        <Tooltip
          content={<CustomTooltipYearly />}
          cursor={{ stroke: "rgba(255,255,255,0.08)" }}
        />
        {baselineY1 !== undefined && (
          <ReferenceLine
            y={baselineY1}
            stroke="rgba(249,115,22,0.35)"
            strokeWidth={1}
            strokeDasharray="4 3"
            label={{
              value: `Basis ${formatPercent(baselineY1, 1)}`,
              position: "insideTopRight",
              fontSize: 9,
              fill: "rgba(249,115,22,0.6)",
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="bruttoMietrendite"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: "#f97316" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
