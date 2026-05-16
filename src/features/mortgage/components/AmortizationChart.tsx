"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { type AmortizationYear, type AmortizationMonth } from "../calculations";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type Props = {
  data: AmortizationYear[];
  monthlyData?: AmortizationMonth[];
  zinsbindung?: number; // years from start → chart marker
  height?: number | `${number}%`;
  monthly?: boolean;
};

const CustomTooltipYearly = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const principal =
    payload.find((p: any) => p.dataKey === "principal")?.value ?? 0;
  const interest =
    payload.find((p: any) => p.dataKey === "interest")?.value ?? 0;
  const balance =
    payload.find((p: any) => p.dataKey === "balance")?.value ?? 0;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-emerald-400">
        Tilgung: {formatCurrency(principal, "de-DE")}
      </p>
      <p className="text-indigo-400">
        Zinsen: {formatCurrency(interest, "de-DE")}
      </p>
      <p className="text-white/40 border-t border-white/10 pt-0.5 mt-0.5 tabular-nums">
        Restschuld: {formatCurrency(balance, "de-DE")}
      </p>
    </div>
  );
};

const CustomTooltipMonthly = ({ active, payload, monthlyData }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as AmortizationMonth;
  const principal =
    payload.find((p: any) => p.dataKey === "principal")?.value ?? 0;
  const interest =
    payload.find((p: any) => p.dataKey === "interest")?.value ?? 0;
  const balance =
    payload.find((p: any) => p.dataKey === "balance")?.value ?? 0;
  const monthName = MONTH_NAMES[(entry.month ?? 1) - 1];
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">{monthName} {entry.calendarYear}</p>
      <p className="text-emerald-400">
        Tilgung: {formatCurrency(principal, "de-DE")}
      </p>
      <p className="text-indigo-400">
        Zinsen: {formatCurrency(interest, "de-DE")}
      </p>
      <p className="text-white/40 border-t border-white/10 pt-0.5 mt-0.5 tabular-nums">
        Restschuld: {formatCurrency(balance, "de-DE")}
      </p>
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-4 mt-1">
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 opacity-85" />
      <span className="text-[10px] text-muted-foreground">Tilgung</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500 opacity-85" />
      <span className="text-[10px] text-muted-foreground">Zinsen</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-0.5 bg-white/35" />
      <span className="text-[10px] text-muted-foreground">Restschuld</span>
    </div>
  </div>
);

export function AmortizationChart({ data, monthlyData, zinsbindung, height = 220, monthly = false }: Props) {
  if (monthly && monthlyData && monthlyData.length > 0) {
    // Monthly mode: one bar per month, x-axis labels at each January
    const yearStartTicks = monthlyData
      .filter((d) => d.month === 1)
      .map((d) => d.monthIndex);

    const zinsbindungMonthIndex = zinsbindung ? zinsbindung * 12 : undefined;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={monthlyData}
          margin={{ top: 4, right: 52, left: 0, bottom: 18 }}
          barSize={Math.max(1, Math.min(8, 280 / Math.max(monthlyData.length, 1)))}
          barCategoryGap="10%"
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
            yAxisId="bars"
            tick={{ fontSize: 10, fill: "#6b6b6b" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
            width={52}
          />
          <YAxis
            yAxisId="line"
            orientation="right"
            tick={{ fontSize: 10, fill: "#6b6b6b" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
            width={52}
          />
          <Tooltip
            content={<CustomTooltipMonthly monthlyData={monthlyData} />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          {zinsbindungMonthIndex !== undefined && (
            <ReferenceLine
              yAxisId="bars"
              x={zinsbindungMonthIndex}
              stroke="rgba(251,191,36,0.55)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{
                value: "Zinsbindung",
                position: "insideTopRight",
                fontSize: 9,
                fill: "rgba(251,191,36,0.7)",
              }}
            />
          )}
          <Bar
            yAxisId="bars"
            dataKey="principal"
            name="Tilgung"
            stackId="a"
            fill="#22c55e"
            fillOpacity={0.85}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            yAxisId="bars"
            dataKey="interest"
            name="Zinsen"
            stackId="a"
            fill="#6366f1"
            fillOpacity={0.85}
            radius={[0, 0, 0, 0]}
          />
          <Line
            yAxisId="line"
            type="monotone"
            dataKey="balance"
            name="Restschuld"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "rgba(255,255,255,0.6)" }}
          />
          <Legend content={<CustomLegend />} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Yearly mode (original)
  const zinsbindungYear = zinsbindung
    ? data.find((d) => d.year === zinsbindung)?.calendarYear
    : undefined;

  const chartData = data;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 4, right: 52, left: 0, bottom: 18 }}
        barSize={Math.max(4, Math.min(14, 280 / Math.max(data.length, 1)))}
        barCategoryGap="25%"
      >
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="calendarYear"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          interval={Math.max(0, Math.ceil(data.length / 6) - 1)}
        />
        <YAxis
          yAxisId="bars"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
          width={52}
        />
        <YAxis
          yAxisId="line"
          orientation="right"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
          width={52}
        />
        <Tooltip
          content={<CustomTooltipYearly />}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        {zinsbindungYear !== undefined && (
          <ReferenceLine
            yAxisId="bars"
            x={zinsbindungYear}
            stroke="rgba(251,191,36,0.55)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{
              value: "Zinsbindung",
              position: "insideTopRight",
              fontSize: 9,
              fill: "rgba(251,191,36,0.7)",
            }}
          />
        )}
        <Bar
          yAxisId="bars"
          dataKey="principal"
          name="Tilgung"
          stackId="a"
          fill="#22c55e"
          fillOpacity={0.85}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          yAxisId="bars"
          dataKey="interest"
          name="Zinsen"
          stackId="a"
          fill="#6366f1"
          fillOpacity={0.85}
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="line"
          type="monotone"
          dataKey="balance"
          name="Restschuld"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "rgba(255,255,255,0.6)" }}
        />
        <Legend content={<CustomLegend />} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
