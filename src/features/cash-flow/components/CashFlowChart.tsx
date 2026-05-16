"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { type CashFlowYear, type CashFlowMonth } from "../calculations";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type Props = {
  data: CashFlowYear[];
  monthlyData?: CashFlowMonth[];
  height?: number | `${number}%`;
  monthly?: boolean;
};

const CustomTooltipYearly = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as CashFlowYear;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">Jahr {label}</p>
      <p className="text-emerald-400">
        Miete netto: {formatCurrency(entry.netRent, "de-DE")}
      </p>
      <p className="text-indigo-400">
        Kredit: −{formatCurrency(entry.mortgage, "de-DE")}
      </p>
      <p className="text-orange-400">
        Rücklagen: −{formatCurrency(entry.ruecklagen, "de-DE")}
      </p>
      <p className="text-purple-400">
        Nebenkosten: −{formatCurrency(entry.nichtUmlagefaehig, "de-DE")}
      </p>
      <p
        className={`font-semibold border-t border-white/10 pt-0.5 mt-0.5 ${
          entry.cashFlow >= 0 ? "text-amber-400" : "text-red-400"
        }`}
      >
        Cashflow: {formatCurrency(entry.cashFlow, "de-DE")}
      </p>
    </div>
  );
};

const CustomTooltipMonthly = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as CashFlowMonth;
  const monthName = MONTH_NAMES[(entry.month ?? 1) - 1];
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">{monthName} {entry.calendarYear}</p>
      <p className="text-emerald-400">
        Miete netto: {formatCurrency(entry.netRent, "de-DE")}
      </p>
      <p className="text-indigo-400">
        Kredit: −{formatCurrency(entry.mortgage, "de-DE")}
      </p>
      <p className="text-orange-400">
        Rücklagen: −{formatCurrency(entry.ruecklagen, "de-DE")}
      </p>
      <p className="text-purple-400">
        Nebenkosten: −{formatCurrency(entry.nichtUmlagefaehig, "de-DE")}
      </p>
      <p
        className={`font-semibold border-t border-white/10 pt-0.5 mt-0.5 ${
          entry.cashFlow >= 0 ? "text-amber-400" : "text-red-400"
        }`}
      >
        Cashflow: {formatCurrency(entry.cashFlow, "de-DE")}
      </p>
    </div>
  );
};

export function CashFlowChart({ data, monthlyData, height = 220, monthly = false }: Props) {
  if (monthly && monthlyData && monthlyData.length > 0) {
    // Monthly mode: one bar per month, x-axis labels at each January
    const yearStartTicks = monthlyData
      .filter((d) => d.month === 1)
      .map((d) => d.monthIndex);

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={monthlyData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barSize={Math.max(1, Math.min(8, 320 / Math.max(monthlyData.length, 1)))}
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="0"
          />
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
          <Tooltip content={<CustomTooltipMonthly />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <Bar dataKey="cashFlow" radius={[1, 1, 0, 0]}>
            {monthlyData.map((entry) => (
              <Cell
                key={entry.monthIndex}
                fill={entry.cashFlow >= 0 ? "#f59e0b" : "#ef4444"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Yearly mode (original)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        barSize={Math.max(4, Math.min(16, 320 / Math.max(data.length, 1)))}
      >
        <CartesianGrid
          vertical={false}
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="0"
        />
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
          tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
          width={56}
        />
        <Tooltip content={<CustomTooltipYearly />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <Bar dataKey="cashFlow" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.year}
              fill={entry.cashFlow >= 0 ? "#f59e0b" : "#ef4444"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
