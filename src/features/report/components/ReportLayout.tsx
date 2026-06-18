"use client";

import type { ReactNode } from "react";
import { REPORT_COLORS } from "../report-theme";

// A single A4 page with a running header and footer band.
export function ReportPage({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  return (
    <div className="report-page">
      <div className="report-header">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#9aa1ab]">
          {section}
        </span>
        <Wordmark small />
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
      <div className="report-footer">
        <span>Portfolio-Finanzierungsbericht · Erstellt mit Immotrim</span>
        <span>
          Seite <span className="report-page-num" />
        </span>
      </div>
    </div>
  );
}

export function Wordmark({ small }: { small?: boolean }) {
  return (
    <span
      className={small ? "text-[11px] font-semibold" : "text-base font-semibold"}
      style={{ color: REPORT_COLORS.text, letterSpacing: "-0.01em" }}
    >
      immo<span style={{ color: REPORT_COLORS.cashflow }}>trim</span>
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-[15px] font-semibold" style={{ color: REPORT_COLORS.text }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-[11px] mt-0.5" style={{ color: REPORT_COLORS.muted }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="report-avoid-break rounded-lg px-3 py-2.5"
      style={{ border: `1px solid ${REPORT_COLORS.cardBorder}` }}
    >
      <p className="text-[9px] uppercase tracking-wide" style={{ color: REPORT_COLORS.muted }}>
        {label}
      </p>
      <p
        className="text-[15px] font-semibold tabular-nums mt-0.5"
        style={{ color: accent ?? REPORT_COLORS.text }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[9px] mt-0.5 tabular-nums" style={{ color: REPORT_COLORS.muted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function KpiGrid({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

// A compact two-column label/value fact list (omits rows with no value).
export type Fact = { label: string; value: string | null | undefined; accent?: string };

export function FactList({ facts, title }: { facts: Fact[]; title?: string }) {
  const visible = facts.filter((f) => f.value !== null && f.value !== undefined && f.value !== "");
  if (visible.length === 0) return null;
  return (
    <div>
      {title && (
        <p
          className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: REPORT_COLORS.muted }}
        >
          {title}
        </p>
      )}
      <div className="flex flex-col">
        {visible.map((f, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-3 py-[3px]"
            style={{ borderBottom: i < visible.length - 1 ? `1px solid #f1f3f6` : "none" }}
          >
            <span className="text-[10.5px]" style={{ color: REPORT_COLORS.muted }}>
              {f.label}
            </span>
            <span
              className="text-[10.5px] font-medium tabular-nums text-right"
              style={{ color: f.accent ?? REPORT_COLORS.text }}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartFrame({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="report-avoid-break rounded-lg p-3"
      style={{ border: `1px solid ${REPORT_COLORS.cardBorder}` }}
    >
      <p className="text-[11px] font-semibold" style={{ color: REPORT_COLORS.text }}>
        {title}
      </p>
      {caption && (
        <p className="text-[9.5px] mt-0.5 mb-1" style={{ color: REPORT_COLORS.muted }}>
          {caption}
        </p>
      )}
      <div className="mt-1">{children}</div>
    </div>
  );
}
