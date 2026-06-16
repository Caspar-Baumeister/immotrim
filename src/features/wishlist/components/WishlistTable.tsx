"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, ExternalLink, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SortableHeader } from "./SortableHeader";
import { LageBadge } from "./LageBadge";
import {
  YieldSettingsPopover,
  CashflowSettingsPopover,
  EkReturnSettingsPopover,
} from "./ColumnSettingsPopovers";
import { calculateWishlistRowKpis, effectiveRent } from "../calculations";
import { useGlobalAssumptions } from "../global-assumptions-store";
import type { WishlistGlobalAssumptions, WishlistProperty, WishlistRowKpis } from "../types";
import { LAGE_OPTIONS, totalNebenkostenPct } from "../types";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

type SortDir = "asc" | "desc";

type SortKey =
  | "name"
  | "address"
  | "lage"
  | "kaufpreis"
  | "wohnflaeche"
  | "pricePerSqm"
  | "kaltmiete"
  | "mietrendite"
  | "monthlyCashFlow"
  | "ekRendite";

type EnrichedRow = WishlistProperty & { kpis: WishlistRowKpis; rent: number };

type Props = {
  rows: WishlistProperty[];
  locale: string;
  onDelete: (id: string) => void;
  deletingId: string | null;
};

// Lower index = better rating; used to sort the Lage column numerically
const LAGE_ORDER: Record<string, number> = Object.fromEntries(
  LAGE_OPTIONS.map((v, i) => [v, i])
);

function getSortValue(row: EnrichedRow, key: SortKey): number | string | null {
  switch (key) {
    case "name":
      return row.name.toLowerCase();
    case "address":
      return (row.address ?? "").toLowerCase();
    case "lage":
      return row.lage ? LAGE_ORDER[row.lage] ?? 999 : null;
    case "kaufpreis":
      return row.kaufpreis;
    case "wohnflaeche":
      return row.wohnflaeche;
    case "pricePerSqm":
      return row.kpis.pricePerSqm;
    case "kaltmiete":
      return row.rent;
    case "mietrendite":
      return row.kpis.mietrendite;
    case "monthlyCashFlow":
      return row.kpis.monthlyCashFlow;
    case "ekRendite":
      return row.kpis.ekRendite;
  }
}

export function WishlistTable({ rows, locale, onDelete, deletingId }: Props) {
  const router = useRouter();
  const t = useTranslations("wishlist");
  const assumptions = useGlobalAssumptions();
  const [sortKey, setSortKey] = useState<SortKey>("mietrendite");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const g: WishlistGlobalAssumptions = {
    zins: assumptions.zins,
    tilgung: assumptions.tilgung,
    leerstandPct: assumptions.leerstandPct,
    ruecklagenPctOfMiete: assumptions.ruecklagenPctOfMiete,
    nichtUmlagefaehigPctOfMiete: assumptions.nichtUmlagefaehigPctOfMiete,
    defaultEigenanteilPct: assumptions.defaultEigenanteilPct,
    yieldMode: assumptions.yieldMode,
    rentBasis: assumptions.rentBasis,
    cashflowSettings: assumptions.cashflowSettings,
    ekReturnSettings: assumptions.ekReturnSettings,
  };

  const enriched: EnrichedRow[] = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        kpis: calculateWishlistRowKpis(r, g),
        rent: effectiveRent(r, g),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rows,
      g.zins,
      g.tilgung,
      g.leerstandPct,
      g.ruecklagenPctOfMiete,
      g.nichtUmlagefaehigPctOfMiete,
      g.defaultEigenanteilPct,
      g.yieldMode,
      g.rentBasis,
      g.cashflowSettings.subtractReserves,
      g.cashflowSettings.subtractNonAllocable,
      g.cashflowSettings.subtractVacancy,
      g.ekReturnSettings.includeTilgung,
    ]
  );

  const sorted = useMemo(() => {
    const out = [...enriched];
    out.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const aNull = av === null || av === undefined || av === "";
      const bNull = bv === null || bv === undefined || bv === "";
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return out;
  }, [enriched, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("desc");
    }
  };

  const yieldLabel =
    assumptions.yieldMode === "netto" ? t("columns.netYield") : t("columns.grossYield");

  return (
    <>
      {/* Mobile: stacked cards (the wide comparison table doesn't fit < md) */}
      <div className="md:hidden flex flex-col gap-3">
        {sorted.map((row) => {
          const cfPositive = (row.kpis.monthlyCashFlow ?? 0) >= 0;
          const isExpanded = expandedIds.has(row.id);
          return (
            <div
              key={row.id}
              className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/wishlist/${row.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-foreground truncate">{row.name}</span>
                    <LageBadge value={row.lage} />
                  </div>
                  {row.address && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{row.address}</p>
                  )}
                </button>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {row.exposeUrl && (
                    <a
                      href={row.exposeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={t("openExpose")}
                      className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(row.id)}
                    disabled={deletingId === row.id}
                    className="text-muted-foreground hover:text-red-400 h-7 w-7"
                    aria-label={t("delete")}
                  >
                    {deletingId === row.id ? (
                      <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                <CardMetric label={t("columns.price")} value={fmtCurrency(row.kaufpreis)} />
                <CardMetric label={yieldLabel} value={fmtPct(row.kpis.mietrendite)} />
                <CardMetric
                  label={t("columns.cashflow")}
                  value={fmtCurrency(row.kpis.monthlyCashFlow)}
                  valueClassName={cn(
                    row.kpis.monthlyCashFlow == null
                      ? "text-muted-foreground"
                      : cfPositive
                      ? "text-amber-400"
                      : "text-red-400"
                  )}
                />
                <CardMetric label={t("columns.ekReturn")} value={fmtPct(row.kpis.ekRendite)} />
                <CardMetric label={t("columns.area")} value={fmtArea(row.wohnflaeche)} />
                <CardMetric
                  label={t("columns.pricePerSqm")}
                  value={fmtCurrency(row.kpis.pricePerSqm)}
                />
              </div>

              <button
                type="button"
                onClick={() => toggleExpanded(row.id)}
                aria-expanded={isExpanded}
                className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight
                  className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")}
                />
                {t("sections.details")}
              </button>
              {isExpanded && (
                <div className="border-t border-border/50 pt-3">
                  <DetailPanel row={row} t={t} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: full comparison table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <SortableHeader
              label={t("columns.name")}
              sortKey="name"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label={t("columns.address")}
              sortKey="address"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label={t("columns.lage")}
              sortKey="lage"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label={t("columns.price")}
              sortKey="kaufpreis"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              align="right"
            />
            <SortableHeader
              label={t("columns.area")}
              sortKey="wohnflaeche"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              align="right"
            />
            <SortableHeader
              label={t("columns.pricePerSqm")}
              sortKey="pricePerSqm"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              align="right"
            />
            <SortableHeader
              label={t("columns.rent")}
              sortKey="kaltmiete"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              align="right"
            />
            <HeaderWithSettings
              label={yieldLabel}
              sortKey="mietrendite"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              settings={<YieldSettingsPopover />}
            />
            <HeaderWithSettings
              label={t("columns.cashflow")}
              sortKey="monthlyCashFlow"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              settings={<CashflowSettingsPopover />}
            />
            <HeaderWithSettings
              label={t("columns.ekReturn")}
              sortKey="ekRendite"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              settings={<EkReturnSettingsPopover />}
            />
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const cfPositive = (row.kpis.monthlyCashFlow ?? 0) >= 0;
            const isExpanded = expandedIds.has(row.id);
            return (
              <Fragment key={row.id}>
              <TableRow
                key={row.id}
                onClick={() => router.push(`/${locale}/wishlist/${row.id}`)}
                className="cursor-pointer"
              >
                <TableCell
                  className="w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(row.id);
                  }}
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {row.name}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[220px] truncate">
                  {row.address ?? "—"}
                </TableCell>
                <TableCell>
                  <LageBadge value={row.lage} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtCurrency(row.kaufpreis)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtArea(row.wohnflaeche)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {fmtCurrency(row.kpis.pricePerSqm)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtCurrency(row.rent || null)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(row.kpis.mietrendite)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-medium",
                    row.kpis.monthlyCashFlow == null
                      ? "text-muted-foreground"
                      : cfPositive
                      ? "text-amber-400"
                      : "text-red-400"
                  )}
                >
                  {fmtCurrency(row.kpis.monthlyCashFlow)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(row.kpis.ekRendite)}
                </TableCell>
                <TableCell
                  className="w-16"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-0.5">
                    {row.exposeUrl && (
                      <a
                        href={row.exposeUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={t("openExpose")}
                        className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="text-muted-foreground hover:text-red-400"
                      aria-label={t("delete")}
                    >
                      {deletingId === row.id ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="hover:bg-transparent bg-muted/20">
                  <TableCell colSpan={12} className="py-3">
                    <DetailPanel row={row} t={t} />
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </>
  );
}

function CardMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </span>
      <span className={cn("text-sm font-medium tabular-nums text-foreground", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function DetailPanel({
  row,
  t,
}: {
  row: EnrichedRow;
  t: ReturnType<typeof useTranslations>;
}) {
  const d = row.details;
  const nkPct = totalNebenkostenPct(row.extras.nebenkosten);
  const items: { label: string; value: string }[] = [
    { label: t("fields.istMiete"), value: fmtCurrency(row.istMiete) },
    { label: t("fields.sollMiete"), value: fmtCurrency(row.sollMiete) },
    { label: t("add.equity"), value: fmtCurrency(row.eigenanteil) },
    { label: t("sections.nebenkosten"), value: formatPercent(nkPct, 2) },
    { label: t("fields.yearBuilt"), value: row.baujahr ? String(row.baujahr) : "—" },
    {
      label: t("fields.etage"),
      value:
        d.etage != null
          ? `${d.etage}${d.etagenGesamt != null ? ` / ${d.etagenGesamt}` : ""}`
          : "—",
    },
    {
      label: t("fields.rooms"),
      value:
        (row.zimmer != null ? String(row.zimmer) : "—") +
        (d.schlafzimmer != null || d.badezimmer != null
          ? ` (${d.schlafzimmer ?? "–"} / ${d.badezimmer ?? "–"})`
          : ""),
    },
    { label: t("fields.hausgeld"), value: fmtCurrency(d.hausgeld ?? null) },
    { label: t("fields.wohnungstyp"), value: d.wohnungstyp ?? "—" },
    { label: t("fields.energieKlasse"), value: d.energieKlasse ?? "—" },
    { label: t("fields.heizungsart"), value: d.heizungsart ?? "—" },
    { label: t("fields.objektzustand"), value: d.objektzustand ?? "—" },
    {
      label: t("fields.provisionsfrei"),
      value: d.provisionsfrei == null ? "—" : d.provisionsfrei ? "Ja" : "Nein",
    },
    { label: t("fields.maklerTelefon"), value: d.maklerTelefon ?? "—" },
  ];
  return (
    <div className="flex flex-col gap-2 px-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {it.label}
            </span>
            <span className="text-xs tabular-nums text-foreground">{it.value}</span>
          </div>
        ))}
      </div>
      {row.notes && (
        <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1 whitespace-pre-line">
          {row.notes}
        </p>
      )}
    </div>
  );
}

function HeaderWithSettings({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  settings,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDir;
  onSort: (key: string) => void;
  settings: React.ReactNode;
}) {
  return (
    <TableHead className="text-right">
      <span className="inline-flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors flex-row-reverse",
            activeKey === sortKey
              ? "text-amber-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{label}</span>
          {activeKey === sortKey && (
            <span className="text-[10px]">{direction === "asc" ? "▲" : "▼"}</span>
          )}
        </button>
        {settings}
      </span>
    </TableHead>
  );
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return formatCurrency(v, "de-DE", Math.abs(v) >= 10_000);
}

function fmtArea(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(v)} m²`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  return formatPercent(v);
}
