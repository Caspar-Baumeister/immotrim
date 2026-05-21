"use client";

import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGlobalAssumptions } from "../global-assumptions-store";
import { cn } from "@/lib/utils";

const TRIGGER_CLS =
  "inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50";

export function YieldSettingsPopover() {
  const t = useTranslations("wishlist.colSettings.yield");
  const { yieldMode, setYieldMode } = useGlobalAssumptions();
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={t("title")}
        onClick={(e) => e.stopPropagation()}
        className={TRIGGER_CLS}
      >
        <Settings2 className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("title")}
          </div>
          <Radio
            checked={yieldMode === "brutto"}
            label={t("brutto")}
            formula="Kaltmiete × 12 ÷ Kaufpreis"
            onSelect={() => setYieldMode("brutto")}
          />
          <Radio
            checked={yieldMode === "netto"}
            label={t("netto")}
            formula={t("nettoFormula")}
            onSelect={() => setYieldMode("netto")}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CashflowSettingsPopover() {
  const t = useTranslations("wishlist.colSettings.cashflow");
  const { cashflowSettings, patchCashflow } = useGlobalAssumptions();
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={t("title")}
        onClick={(e) => e.stopPropagation()}
        className={TRIGGER_CLS}
      >
        <Settings2 className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("title")}
          </div>
          <FormulaCard formula={buildCashflowFormula(cashflowSettings)} />
          <div className="flex flex-col gap-2">
            <CheckRow
              label={t("subtractReserves")}
              checked={cashflowSettings.subtractReserves}
              onChange={(v) => patchCashflow({ subtractReserves: v })}
            />
            <CheckRow
              label={t("subtractNonAllocable")}
              checked={cashflowSettings.subtractNonAllocable}
              onChange={(v) => patchCashflow({ subtractNonAllocable: v })}
            />
            <CheckRow
              label={t("subtractVacancy")}
              checked={cashflowSettings.subtractVacancy}
              onChange={(v) => patchCashflow({ subtractVacancy: v })}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EkReturnSettingsPopover() {
  const t = useTranslations("wishlist.colSettings.ekReturn");
  const { ekReturnSettings, patchEkReturn } = useGlobalAssumptions();
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={t("title")}
        onClick={(e) => e.stopPropagation()}
        className={TRIGGER_CLS}
      >
        <Settings2 className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("title")}
          </div>
          <FormulaCard
            formula={
              ekReturnSettings.includeTilgung
                ? "(Cashflow + Tilgung) ÷ (Eigenanteil + Kaufnebenkosten)"
                : "Cashflow ÷ (Eigenanteil + Kaufnebenkosten)"
            }
          />
          <CheckRow
            label={t("includeTilgung")}
            checked={ekReturnSettings.includeTilgung}
            onChange={(v) => patchEkReturn({ includeTilgung: v })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function buildCashflowFormula(s: {
  subtractReserves: boolean;
  subtractNonAllocable: boolean;
  subtractVacancy: boolean;
}): string {
  const parts = ["Kaltmiete − Rate"];
  if (s.subtractVacancy) parts.push("− Leerstand");
  if (s.subtractReserves) parts.push("− Rücklagen");
  if (s.subtractNonAllocable) parts.push("− NK");
  return parts.join(" ");
}

function FormulaCard({ formula }: { formula: string }) {
  return (
    <div className="rounded-md bg-muted/40 border border-border px-2.5 py-1.5 text-xs font-mono text-foreground/90 leading-relaxed">
      {formula}
    </div>
  );
}

function Radio({
  checked,
  label,
  formula,
  onSelect,
}: {
  checked: boolean;
  label: string;
  formula: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-1 text-left rounded-md border px-2.5 py-2 transition-colors",
        checked
          ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/40"
          : "border-border hover:bg-muted/40"
      )}
    >
      <span className={cn("text-xs font-medium", checked ? "text-amber-300" : "text-foreground")}>
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground font-mono">{formula}</span>
    </button>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border bg-transparent text-amber-400 focus:ring-amber-400/40 focus:ring-1"
      />
      <span className="text-foreground">{label}</span>
    </label>
  );
}
