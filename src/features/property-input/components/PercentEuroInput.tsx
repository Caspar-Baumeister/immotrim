"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

type Unit = "percent" | "euro";

type Props = {
  label: string;
  /** Stored value, always expressed in the `canonical` unit. */
  value: number;
  /** Which unit `value` is stored in. The user can still type the other unit. */
  canonical: Unit;
  /** Reference amount for %↔€ conversion (e.g. Kaufpreis, or monatliche Miete). */
  base: number;
  onChange: (value: number) => void;
  info?: string;
  className?: string;
};

// A single numeric field that accepts entry in EITHER percent or euro and
// stores one canonical unit. A small toggle flips the entry unit; the converted
// value is shown live underneath (e.g. Makler 3,57 % = 1.964 €).
export function PercentEuroInput({
  label,
  value,
  canonical,
  base,
  onChange,
  info,
  className,
}: Props) {
  const [unit, setUnit] = useState<Unit>(canonical);
  const [inputStr, setInputStr] = useState("");

  // Convert the canonical value into the currently-active entry unit.
  const toActive = (v: number): number => {
    if (unit === canonical) return v;
    if (canonical === "percent") return (base * v) / 100; // % → €
    return base > 0 ? (v / base) * 100 : 0; // € → %
  };

  // Convert a value typed in the active unit back to the canonical unit.
  const toCanonical = (v: number): number => {
    if (unit === canonical) return v;
    if (canonical === "percent") return base > 0 ? (v / base) * 100 : 0; // € → %
    return (base * v) / 100; // % → €
  };

  // Keep the visible string in sync with the stored value / unit / base.
  useEffect(() => {
    const shown = toActive(value);
    setInputStr(
      Number.isFinite(shown)
        ? String(Math.round(shown * 100) / 100)
        : ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unit, base]);

  const commit = (raw: string) => {
    const v = parseFloat(raw.replace(",", "."));
    if (!Number.isNaN(v)) onChange(toCanonical(v));
  };

  // The opposite unit, formatted for the live hint line.
  const otherHint = (() => {
    if (base <= 0) return null;
    if (unit === "percent") {
      const euro = canonical === "percent" ? (base * value) / 100 : value;
      return formatCurrency(euro, "de-DE", Math.abs(euro) >= 10_000);
    }
    const pct = canonical === "percent" ? value : (value / base) * 100;
    return formatPercent(pct, 2);
  })();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-muted-foreground">{label}</label>
          {info && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-muted-foreground/60 hover:text-muted-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <TooltipContent side="top" className="max-w-[260px] text-left leading-snug">
                {info}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            inputMode="decimal"
            value={inputStr}
            onChange={(e) => {
              setInputStr(e.target.value);
              const v = parseFloat(e.target.value.replace(",", "."));
              if (!Number.isNaN(v)) onChange(toCanonical(v));
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            }}
            className="w-24 h-7 text-right text-sm bg-muted/50 border-border focus-visible:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <UnitToggle unit={unit} onChange={setUnit} />
        </div>
      </div>
      {otherHint && (
        <div className="flex justify-end">
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            = {otherHint}
          </span>
        </div>
      )}
    </div>
  );
}

function UnitToggle({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="flex items-center rounded-md bg-muted/60 p-0.5 text-[11px] leading-none">
      {(["percent", "euro"] as Unit[]).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={cn(
            "px-1.5 py-1 rounded transition-colors",
            unit === u
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {u === "percent" ? "%" : "€"}
        </button>
      ))}
    </div>
  );
}
