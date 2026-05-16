"use client";

import { useState } from "react";
import { Info, ChevronDown } from "lucide-react";
import { usePropertyFormStore } from "@/lib/store";
import { type Nebenkosten, type TaxInputs } from "@/lib/supabase";
import { InputSection } from "./InputSection";
import { SliderInput } from "./SliderInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils";

// ── Inline toggle switch (no Switch component in shadcn setup) ──────────────
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer group"
      aria-checked={checked}
      role="switch"
    >
      <div
        className={cn(
          "relative w-8 h-4.5 rounded-full transition-colors duration-200",
          checked ? "bg-amber-500" : "bg-muted-foreground/30"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-4" : "left-0.5"
          )}
        />
      </div>
      {label && (
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
      )}
    </button>
  );
}

// ── Derived mortgage display ─────────────────────────────────────────────────
function calcMonthlyPayment(
  kaufpreis: number,
  eigenanteil: number,
  zins: number,
  tilgung: number
): number {
  const D = Math.max(0, kaufpreis - eigenanteil);
  return D * (zins / 100 + tilgung / 100) / 12;
}

function calcTotalYears(
  kaufpreis: number,
  eigenanteil: number,
  zins: number,
  tilgung: number
): number {
  const D = Math.max(0, kaufpreis - eigenanteil);
  const r = zins / 100 / 12;
  const A = D * (zins / 100 + tilgung / 100) / 12;
  if (D <= 0 || A <= 0) return 0;
  if (r === 0) return Math.ceil(D / A / 12);
  const ratio = (D * r) / A;
  if (ratio >= 1) return 50;
  return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r) / 12);
}

export function PropertyForm() {
  const { name, address, inputs, setName, setAddress, setInput } =
    usePropertyFormStore();

  // Auto-fill tracking
  const [nkAuto, setNkAuto] = useState(true);
  const [ruecklagenAuto, setRuecklagenAuto] = useState(true);
  const [nebenkostenOpen, setNebenkostenOpen] = useState(false);

  // Derived values for display
  const darlehensbetrag = Math.max(0, inputs.kaufpreis - inputs.eigenanteil);
  const monthlyPayment = calcMonthlyPayment(
    inputs.kaufpreis,
    inputs.eigenanteil,
    inputs.zins,
    inputs.tilgung
  );
  const totalYears = calcTotalYears(
    inputs.kaufpreis,
    inputs.eigenanteil,
    inputs.zins,
    inputs.tilgung
  );

  const totalNebenkostenPct =
    inputs.nebenkosten.grunderwerbsteuerPct +
    inputs.nebenkosten.notarGrundbuchPct +
    inputs.nebenkosten.maklerprovisionPct +
    inputs.nebenkosten.sonstigePct;
  const totalNebenkostenEur = (inputs.kaufpreis * totalNebenkostenPct) / 100;

  // Handlers with auto-fill
  const handleKaufpreisChange = (v: number) => {
    setInput("kaufpreis", v);
    if (ruecklagenAuto) {
      setInput("ruecklagen", Math.round((v * 0.01) / 12));
    }
  };

  const handleKaltmieteChange = (v: number) => {
    setInput("kaltmiete", v);
    if (nkAuto) {
      setInput("nichtUmlagefaehig", Math.round(v * 0.2));
    }
  };

  const handleNichtUmlagefaehigChange = (v: number) => {
    setNkAuto(false);
    setInput("nichtUmlagefaehig", v);
  };

  const handleRuecklagenChange = (v: number) => {
    setRuecklagenAuto(false);
    setInput("ruecklagen", v);
  };

  const setNebenkostenField = (
    field: keyof Nebenkosten,
    value: number
  ) => {
    setInput("nebenkosten", { ...inputs.nebenkosten, [field]: value });
  };

  const toggleTax = (enabled: boolean) => {
    if (enabled) {
      setInput("tax", {
        gebaeudeanteilPct: 70,
        bemessungsgrundlage: inputs.kaufpreis,
        steuersatz: 42,
      } as TaxInputs);
    } else {
      setInput("tax", undefined);
    }
  };

  const setTaxField = (field: keyof TaxInputs, value: number) => {
    if (inputs.tax) {
      setInput("tax", { ...inputs.tax, [field]: value });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Property identity */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Bezeichnung</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Berliner Wohnung"
            className="bg-card border-border focus-visible:ring-1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Adresse</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="z.B. Musterstraße 1, 10115 Berlin"
            className="bg-card border-border focus-visible:ring-1"
          />
        </div>
      </div>

      {/* ── Allgemein ─────────────────────────────────────────────────────── */}
      <InputSection title="Allgemein" defaultOpen>
        {/* Kaufpreis */}
        <SliderInput
          label="Kaufpreis"
          value={inputs.kaufpreis}
          onChange={handleKaufpreisChange}
          min={50000}
          max={2000000}
          step={5000}
          unit="€"
          unitPosition="prefix"
        />

        {/* Nebenkosten collapsible */}
        <Collapsible open={nebenkostenOpen} onOpenChange={setNebenkostenOpen}>
          <CollapsibleTrigger className="w-full group">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Nebenkosten</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-semibold tabular-nums">
                  {formatPercent(totalNebenkostenPct, 2)} ={" "}
                  {formatCurrency(totalNebenkostenEur, "de-DE", true)}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                    nebenkostenOpen && "rotate-180"
                  )}
                />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 pl-3 border-l border-border/60 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Provisionsfrei</span>
                <ToggleSwitch
                  checked={inputs.nebenkosten.maklerprovisionPct === 0}
                  onChange={(v) =>
                    setNebenkostenField("maklerprovisionPct", v ? 0 : 3.57)
                  }
                />
              </div>
              <SliderInput
                label="Grunderwerbsteuer"
                value={inputs.nebenkosten.grunderwerbsteuerPct}
                onChange={(v) => setNebenkostenField("grunderwerbsteuerPct", v)}
                min={3.5}
                max={6.5}
                step={0.5}
                unit="%"
              />
              <SliderInput
                label="Notar + Grundbuch"
                value={inputs.nebenkosten.notarGrundbuchPct}
                onChange={(v) => setNebenkostenField("notarGrundbuchPct", v)}
                min={0.5}
                max={3}
                step={0.1}
                unit="%"
              />
              <SliderInput
                label="Maklerprovision"
                value={inputs.nebenkosten.maklerprovisionPct}
                onChange={(v) => setNebenkostenField("maklerprovisionPct", v)}
                min={0}
                max={7}
                step={0.1}
                unit="%"
              />
              <SliderInput
                label="Sonstiges"
                value={inputs.nebenkosten.sonstigePct}
                onChange={(v) => setNebenkostenField("sonstigePct", v)}
                min={0}
                max={5}
                step={0.1}
                unit="%"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Eigenanteil */}
        <SliderInput
          label="Eigenanteil"
          value={inputs.eigenanteil}
          onChange={(v) => setInput("eigenanteil", v)}
          min={0}
          max={Math.max(inputs.kaufpreis, 500000)}
          step={5000}
          unit="€"
          unitPosition="prefix"
        />

        {/* Kredit divider */}
        <div className="border-t border-border/60 pt-4 flex flex-col gap-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider -mb-1">
            Finanzierung
          </p>

          <SliderInput
            label="Zinssatz (p.a.)"
            value={inputs.zins}
            onChange={(v) => setInput("zins", v)}
            min={0.5}
            max={8}
            step={0.05}
            unit="%"
          />
          <SliderInput
            label="Tilgung (p.a.)"
            value={inputs.tilgung}
            onChange={(v) => setInput("tilgung", v)}
            min={0.5}
            max={10}
            step={0.1}
            unit="%"
          />
          <SliderInput
            label="Zinsbindung"
            value={inputs.zinsbindung}
            onChange={(v) => setInput("zinsbindung", v)}
            min={5}
            max={30}
            step={1}
            unit=" J"
            formatDisplay={(v) => `${v}`}
          />

          {/* Loan start date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Beginn</span>
            <input
              type="month"
              value={inputs.loanStartDate}
              onChange={(e) => setInput("loanStartDate", e.target.value)}
              className="bg-muted/50 border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 [color-scheme:dark]"
            />
          </div>

          {/* Annuitätendarlehen toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">
                Annuitätendarlehen
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <TooltipContent side="top">
                  Konstante monatliche Rate aus Zins und Tilgung.
                  Der Tilgungsanteil steigt, der Zinsanteil sinkt über die Zeit.
                </TooltipContent>
              </Tooltip>
            </div>
            <ToggleSwitch
              checked={inputs.annuitaetendarlehen}
              onChange={(v) => setInput("annuitaetendarlehen", v)}
            />
          </div>

          {/* Derived display */}
          <div className="bg-muted/30 rounded-lg px-3 py-2.5 flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Darlehensbetrag</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(darlehensbetrag, "de-DE", true)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monatliche Rate</span>
              <span className="font-semibold tabular-nums text-amber-400">
                {formatCurrency(monthlyPayment)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volltilgung nach</span>
              <span className="font-semibold tabular-nums text-foreground">
                ~{totalYears} Jahren
              </span>
            </div>
          </div>
        </div>

        {/* Rent */}
        <div className="border-t border-border/60 pt-4 flex flex-col gap-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider -mb-1">
            Mieteinnahmen
          </p>
          <SliderInput
            label="Kaltmiete"
            value={inputs.kaltmiete}
            onChange={handleKaltmieteChange}
            min={200}
            max={5000}
            step={25}
            unit="€"
            unitPosition="prefix"
          />
          <div className="flex flex-col gap-2">
            <SliderInput
              label="Nicht umlagefähige NK"
              value={inputs.nichtUmlagefaehig}
              onChange={handleNichtUmlagefaehigChange}
              min={0}
              max={1000}
              step={10}
              unit="€"
              unitPosition="prefix"
            />
            {nkAuto && (
              <p className="text-[10px] text-muted-foreground/60 pl-0.5">
                Auto: ~20% der Kaltmiete
              </p>
            )}
          </div>
          <SliderInput
            label="Leerstand"
            value={inputs.leerstand}
            onChange={(v) => setInput("leerstand", v)}
            min={0}
            max={20}
            step={0.5}
            unit="%"
          />
        </div>
      </InputSection>

      {/* ── Rücklagen ─────────────────────────────────────────────────────── */}
      <InputSection title="Rücklagen" defaultOpen>
        <div className="flex flex-col gap-2">
          <SliderInput
            label="Rücklagen / Monat"
            value={inputs.ruecklagen}
            onChange={handleRuecklagenChange}
            min={0}
            max={2000}
            step={25}
            unit="€"
            unitPosition="prefix"
          />
          {ruecklagenAuto && (
            <p className="text-[10px] text-muted-foreground/60 pl-0.5">
              Auto: ~1% des Kaufpreises pro Jahr ≈{" "}
              {formatCurrency(Math.round((inputs.kaufpreis * 0.01) / 12))}/Monat
            </p>
          )}
        </div>
        <div className="bg-muted/20 rounded-lg px-3 py-2 text-[10px] text-muted-foreground/70 leading-relaxed">
          Empfehlung für Altbau: 1,5–2% p.a. | Neubau: 0,5–1% p.a. | Wird von
          Mieteinnahmen abgezogen.
        </div>
      </InputSection>

      {/* ── Steuer (optional) ─────────────────────────────────────────────── */}
      <InputSection title="Steuer (optional)" defaultOpen={false}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Steuerberechnung aktivieren
          </span>
          <ToggleSwitch
            checked={!!inputs.tax}
            onChange={toggleTax}
          />
        </div>
        {inputs.tax && (
          <div className="flex flex-col gap-4 pt-2 border-t border-border/60">
            <SliderInput
              label="Gebäudeanteil"
              value={inputs.tax.gebaeudeanteilPct}
              onChange={(v) => setTaxField("gebaeudeanteilPct", v)}
              min={0}
              max={100}
              step={1}
              unit="%"
            />
            <SliderInput
              label="Bemessungsgrundlage"
              value={inputs.tax.bemessungsgrundlage}
              onChange={(v) => setTaxField("bemessungsgrundlage", v)}
              min={0}
              max={2000000}
              step={5000}
              unit="€"
              unitPosition="prefix"
            />
            <SliderInput
              label="Steuersatz"
              value={inputs.tax.steuersatz}
              onChange={(v) => setTaxField("steuersatz", v)}
              min={0}
              max={55}
              step={1}
              unit="%"
            />
          </div>
        )}
      </InputSection>

      {/* ── Wachstumsannahmen ──────────────────────────────────────────────── */}
      <InputSection title="Wachstumsannahmen" defaultOpen={false}>
        <p className="text-[10px] text-muted-foreground/70 -mb-1">
          Diese Werte dienen als Standardeinstellung für die Stellregler in den Graphen.
        </p>
        <SliderInput
          label="Mietentwicklung p.a."
          value={inputs.mietentwicklung}
          onChange={(v) => setInput("mietentwicklung", v)}
          min={0}
          max={8}
          step={0.1}
          unit="%"
        />
        <SliderInput
          label="Wertentwicklung p.a."
          value={inputs.wertentwicklung}
          onChange={(v) => setInput("wertentwicklung", v)}
          min={-2}
          max={10}
          step={0.1}
          unit="%"
        />
      </InputSection>
    </div>
  );
}
