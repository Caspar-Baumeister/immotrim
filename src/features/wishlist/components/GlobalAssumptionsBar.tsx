"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useGlobalAssumptions } from "../global-assumptions-store";
import { cn } from "@/lib/utils";
import type { RentBasis } from "../types";

export function GlobalAssumptionsBar() {
  const t = useTranslations("wishlist.global");
  const {
    zins,
    tilgung,
    leerstandPct,
    ruecklagenPctOfMiete,
    nichtUmlagefaehigPctOfMiete,
    rentBasis,
    setScalar,
  } = useGlobalAssumptions();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-x-2 gap-y-2 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("title")}
          </span>
          <RentBasisToggle
            value={rentBasis}
            onChange={(v) => setScalar("rentBasis", v)}
            labels={{ ist: t("rentIst"), soll: t("rentSoll") }}
          />
        </div>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {t("vacancy")} {leerstandPct.toFixed(0)}%
          </span>
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <span className="tabular-nums">
            {t("reserves")} {ruecklagenPctOfMiete.toFixed(0)}%
          </span>
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <span className="tabular-nums">
            {t("nonAllocable")} {nichtUmlagefaehigPctOfMiete.toFixed(0)}%
          </span>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            aria-label={t("editDefaults")}
            className="text-muted-foreground/70 hover:text-foreground transition-colors p-1 -mr-1 rounded"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3">
        <SliderField
          label={t("interest")}
          value={zins}
          suffix="%"
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => setScalar("zins", v)}
        />
        <SliderField
          label={t("amortization")}
          value={tilgung}
          suffix="%"
          min={0}
          max={8}
          step={0.1}
          onChange={(v) => setScalar("tilgung", v)}
        />
      </div>

      {settingsOpen && (
        <div className="mt-1 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3">
          <NumberField
            label={t("vacancyFull")}
            value={leerstandPct}
            suffix="%"
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => setScalar("leerstandPct", v)}
          />
          <NumberField
            label={t("reservesFull")}
            value={ruecklagenPctOfMiete}
            suffix={`% ${t("ofRent")}`}
            min={0}
            max={30}
            step={0.5}
            onChange={(v) => setScalar("ruecklagenPctOfMiete", v)}
          />
          <NumberField
            label={t("nonAllocableFull")}
            value={nichtUmlagefaehigPctOfMiete}
            suffix={`% ${t("ofRent")}`}
            min={0}
            max={30}
            step={0.5}
            onChange={(v) => setScalar("nichtUmlagefaehigPctOfMiete", v)}
          />
        </div>
      )}
    </div>
  );
}

function RentBasisToggle({
  value,
  onChange,
  labels,
}: {
  value: RentBasis;
  onChange: (v: RentBasis) => void;
  labels: { ist: string; soll: string };
}) {
  return (
    <div className="flex items-center rounded-md bg-muted/60 p-0.5 text-[11px] leading-none">
      {(["ist", "soll"] as RentBasis[]).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onChange(b)}
          className={cn(
            "px-2 py-1 rounded transition-colors font-medium",
            value === b
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {b === "ist" ? labels.ist : labels.soll}
        </button>
      ))}
    </div>
  );
}

function SliderField({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          const arr = Array.isArray(v) ? v : [v];
          if (typeof arr[0] === "number") onChange(arr[0]);
        }}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          className="w-20 h-7 text-right text-xs"
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}
