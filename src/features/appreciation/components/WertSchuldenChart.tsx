"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { type AppreciationYear, type AppreciationMonth } from "../calculations";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type Props = {
  data: AppreciationYear[];
  monthlyData?: AppreciationMonth[];
  height?: number | `${number}%`;
  monthly?: boolean;
};

const CustomTooltipYearly = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as AppreciationYear;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-blue-400">
        Wert: {formatCurrency(entry.immobilienwert, "de-DE", true)}
      </p>
      <p className="text-red-400">
        Restschuld: {formatCurrency(entry.restschuld, "de-DE", true)}
      </p>
      <p className="text-emerald-400 font-semibold border-t border-border pt-0.5 mt-0.5">
        Nettovermögen: {formatCurrency(entry.eigenkapital, "de-DE", true)}
      </p>
    </div>
  );
};

const CustomTooltipMonthly = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as AppreciationMonth;
  const monthName = MONTH_NAMES[(entry.month ?? 1) - 1];
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">{monthName} {entry.calendarYear}</p>
      <p className="text-blue-400">
        Wert: {formatCurrency(entry.immobilienwert, "de-DE", true)}
      </p>
      <p className="text-red-400">
        Restschuld: {formatCurrency(entry.restschuld, "de-DE", true)}
      </p>
      <p className="text-emerald-400 font-semibold border-t border-border pt-0.5 mt-0.5">
        Nettovermögen: {formatCurrency(entry.eigenkapital, "de-DE", true)}
      </p>
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-4 mt-1">
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-0.5 bg-blue-500 rounded" />
      <span className="text-[10px] text-muted-foreground">Immobilienwert</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-0.5 bg-red-500 rounded" />
      <span className="text-[10px] text-muted-foreground">Restschuld</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 opacity-40" />
      <span className="text-[10px] text-muted-foreground">Nettovermögen</span>
    </div>
  </div>
);

export function WertSchuldenChart({ data, monthlyData, height = 220, monthly = false }: Props) {
  if (monthly && monthlyData && monthlyData.length > 0) {
    const yearStartTicks = monthlyData
      .filter((d) => d.month === 1)
      .map((d) => d.monthIndex);

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={monthlyData}
          margin={{ top: 4, right: 4, left: 0, bottom: 18 }}
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
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
            tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
            width={56}
          />
          <Tooltip
            content={<CustomTooltipMonthly />}
            cursor={{ stroke: "var(--chart-cursor)" }}
          />
          {/* Net worth band: filled region between Restschuld and Immobilienwert */}
          <Area
            type="monotone"
            dataKey="restschuld"
            stackId="networth"
            stroke="none"
            fill="none"
            fillOpacity={0}
            legendType="none"
            activeDot={false}
            tooltipType="none"
          />
          <Area
            type="monotone"
            dataKey="eigenkapital"
            stackId="networth"
            stroke="none"
            fill="#10b981"
            fillOpacity={0.12}
            legendType="none"
            activeDot={false}
            tooltipType="none"
          />
          <Line
            type="monotone"
            dataKey="immobilienwert"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#3b82f6" }}
            name="Immobilienwert"
          />
          <Line
            type="monotone"
            dataKey="restschuld"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#ef4444" }}
            name="Restschuld"
          />
          <Legend content={<CustomLegend />} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Yearly mode (original)
  const chartData = data.filter((d) => d.year >= 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 4, right: 4, left: 0, bottom: 18 }}
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="calendarYear"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          interval={Math.max(0, Math.ceil(chartData.length / 6) - 1)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
          width={56}
        />
        <Tooltip
          content={<CustomTooltipYearly />}
          cursor={{ stroke: "var(--chart-cursor)" }}
        />
        {/* Net worth band: filled region between Restschuld and Immobilienwert */}
        <Area
          type="monotone"
          dataKey="restschuld"
          stackId="networth"
          stroke="none"
          fill="none"
          fillOpacity={0}
          legendType="none"
          activeDot={false}
          tooltipType="none"
        />
        <Area
          type="monotone"
          dataKey="eigenkapital"
          stackId="networth"
          stroke="none"
          fill="#10b981"
          fillOpacity={0.12}
          legendType="none"
          activeDot={false}
          tooltipType="none"
        />
        <Line
          type="monotone"
          dataKey="immobilienwert"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: "#3b82f6" }}
          name="Immobilienwert"
        />
        <Line
          type="monotone"
          dataKey="restschuld"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: "#ef4444" }}
          name="Restschuld"
        />
        <Legend content={<CustomLegend />} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
