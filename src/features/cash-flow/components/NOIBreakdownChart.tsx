"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type Props = {
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  mortgagePayment: number;
  height?: number | `${number}%`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-medium" style={{ color: payload[0].fill }}>
        {payload[0].payload.name}
      </p>
      <p className="text-muted-foreground tabular-nums">
        {formatCurrency(payload[0].value, "de-DE")}
      </p>
    </div>
  );
};

export function NOIBreakdownChart({
  effectiveGrossIncome,
  operatingExpenses,
  noi,
  mortgagePayment,
  height = 220,
}: Props) {
  const data = [
    { name: "Gross Income", value: effectiveGrossIncome, color: "#10b981" },
    { name: "Op. Expenses", value: operatingExpenses, color: "#ef4444" },
    { name: "NOI", value: noi, color: "#f59e0b" },
    { name: "Mortgage", value: mortgagePayment, color: "#6366f1" },
    { name: "Cash Flow", value: noi - mortgagePayment, color: noi - mortgagePayment >= 0 ? "#22c55e" : "#ef4444" },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barSize={14}
      >
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#6b6b6b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v, "de-DE", true)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: "#a0a0a0" }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--chart-cursor)" }} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
