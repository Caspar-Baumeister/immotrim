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
import { type EKRenditeYear, type EKRenditeMonth } from "../calculations";
import { formatPercent, formatCurrency } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type Props = {
  data: EKRenditeYear[];
  monthlyData?: EKRenditeMonth[];
  includeTilgung?: boolean;
  includeWertzuwachs?: boolean;
  height?: number | `${number}%`;
  monthly?: boolean;
  /** Show the effective-equity line + right axis. Off for the portfolio, where
   *  the denominator is a constant invested-equity base and the line is flat. */
  showEffectiveEigenkapital?: boolean;
};

const CustomTooltipYearly = ({
  active,
  payload,
  label,
  includeTilgung,
  includeWertzuwachs,
  showEffectiveEigenkapital,
}: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as EKRenditeYear;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">Jahr {label}</p>
      <p className="text-amber-400">
        Cashflow: {formatCurrency(entry.cashFlow, "de-DE")}
      </p>
      {includeTilgung && (
        <p className="text-emerald-400">
          Tilgung: {formatCurrency(entry.tilgungsanteil, "de-DE")}
        </p>
      )}
      {includeWertzuwachs && (
        <p className="text-blue-400">
          Wertzuwachs: {formatCurrency(entry.wertzuwachs, "de-DE")}
        </p>
      )}
      <p className="text-foreground font-semibold border-t border-border pt-0.5 mt-0.5">
        EK-Rendite:{" "}
        {entry.ekRendite != null ? formatPercent(entry.ekRendite) : "—"}
      </p>
      {showEffectiveEigenkapital && (
        <p className="text-indigo-400">
          Effekt. Eigenkapital: {formatCurrency(entry.effectiveEigenkapital, "de-DE", true)}
        </p>
      )}
    </div>
  );
};

const CustomTooltipMonthly = ({
  active,
  payload,
  includeTilgung,
  includeWertzuwachs,
  showEffectiveEigenkapital,
}: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as EKRenditeMonth;
  const monthName = MONTH_NAMES[(entry.month ?? 1) - 1];
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="text-muted-foreground mb-1">{monthName} {entry.calendarYear}</p>
      <p className="text-amber-400">
        Cashflow: {formatCurrency(entry.cashFlow, "de-DE")}
      </p>
      {includeTilgung && (
        <p className="text-emerald-400">
          Tilgung: {formatCurrency(entry.tilgungsanteil, "de-DE")}
        </p>
      )}
      {includeWertzuwachs && (
        <p className="text-blue-400">
          Wertzuwachs: {formatCurrency(entry.wertzuwachs, "de-DE")}
        </p>
      )}
      <p className="text-foreground font-semibold border-t border-border pt-0.5 mt-0.5">
        EK-Rendite (p.a.):{" "}
        {entry.ekRendite != null ? formatPercent(entry.ekRendite) : "—"}
      </p>
      {showEffectiveEigenkapital && (
        <p className="text-indigo-400">
          Effekt. Eigenkapital: {formatCurrency(entry.effectiveEigenkapital, "de-DE", true)}
        </p>
      )}
    </div>
  );
};

export function EKRenditeChart({
  data,
  monthlyData,
  includeTilgung = false,
  includeWertzuwachs = false,
  height = 220,
  monthly = false,
  showEffectiveEigenkapital = true,
}: Props) {
  const chartMarginRight = showEffectiveEigenkapital ? 48 : 8;
  if (monthly && monthlyData && monthlyData.length > 0) {
    const yearStartTicks = monthlyData
      .filter((d) => d.month === 1)
      .map((d) => d.monthIndex);

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={monthlyData}
          margin={{ top: 4, right: chartMarginRight, left: 0, bottom: 0 }}
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
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#6b6b6b" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            width={40}
          />
          {showEffectiveEigenkapital && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                  ? `${(v / 1_000).toFixed(0)}k`
                  : `${v.toFixed(0)}`
              }
              width={44}
            />
          )}
          <Tooltip
            content={
              <CustomTooltipMonthly
                includeTilgung={includeTilgung}
                includeWertzuwachs={includeWertzuwachs}
                showEffectiveEigenkapital={showEffectiveEigenkapital}
              />
            }
            cursor={{ stroke: "var(--chart-cursor)" }}
          />
          <ReferenceLine
            yAxisId="left"
            y={0}
            stroke="var(--chart-reference)"
            strokeWidth={1}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ekRendite"
            stroke="#ffffff"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 3, fill: "#ffffff" }}
          />
          {showEffectiveEigenkapital && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="effectiveEigenkapital"
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: "#6366f1" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Yearly mode (original)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 4, right: chartMarginRight, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          interval={Math.max(0, Math.ceil(data.length / 6) - 1)}
        />
        {/* Left axis: EK-Rendite % */}
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          width={40}
        />
        {/* Right axis: Effective Eigenkapital € */}
        {showEffectiveEigenkapital && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000
                ? `${(v / 1_000).toFixed(0)}k`
                : `${v.toFixed(0)}`
            }
            width={44}
          />
        )}
        <Tooltip
          content={
            <CustomTooltipYearly
              includeTilgung={includeTilgung}
              includeWertzuwachs={includeWertzuwachs}
              showEffectiveEigenkapital={showEffectiveEigenkapital}
            />
          }
          cursor={{ stroke: "var(--chart-cursor)" }}
        />
        <ReferenceLine
          yAxisId="left"
          y={0}
          stroke="var(--chart-reference)"
          strokeWidth={1}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="ekRendite"
          stroke="#ffffff"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          activeDot={{ r: 3, fill: "#ffffff" }}
        />
        {showEffectiveEigenkapital && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="effectiveEigenkapital"
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, fill: "#6366f1" }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
