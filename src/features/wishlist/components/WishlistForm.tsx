"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputSection } from "@/features/property-input/components/InputSection";
import { SliderInput } from "@/features/property-input/components/SliderInput";
import { PercentEuroInput } from "@/features/property-input/components/PercentEuroInput";
import { useWishlistFormStore } from "../wishlist-form-store";
import { useGlobalAssumptions } from "../global-assumptions-store";
import { LAGE_OPTIONS, totalNebenkostenPct } from "../types";
import type { TaxInputs } from "@/lib/supabase";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

// Minimal toggle (no Switch in the shadcn setup), matching PropertyForm.
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex items-center"
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
    </button>
  );
}

export function WishlistForm() {
  const t = useTranslations("wishlist");
  const s = useWishlistFormStore();
  const g = useGlobalAssumptions();

  // Derived from the model so it stays in sync with extraction/manual edits.
  const provisionsfrei = s.extras.nebenkosten.maklerprovisionPct === 0;

  // Monthly rent used as the base for %↔€ conversions of rent-relative costs.
  const rentBase =
    (g.rentBasis === "ist" ? s.istMiete : s.sollMiete) ||
    s.sollMiete ||
    s.istMiete ||
    0;

  const nkTotalPct = totalNebenkostenPct(s.extras.nebenkosten);
  const nkTotalEur = (s.kaufpreis * nkTotalPct) / 100;

  const growthEnabled =
    s.extras.mietentwicklung !== undefined || s.extras.wertentwicklung !== undefined;

  const toggleGrowth = (enabled: boolean) =>
    s.patchExtras({
      mietentwicklung: enabled ? 2 : undefined,
      wertentwicklung: enabled ? 2 : undefined,
    });

  const toggleTax = (enabled: boolean) =>
    s.patchExtras({
      tax: enabled
        ? { gebaeudeanteilPct: 80, bemessungsgrundlage: s.kaufpreis, afaPct: 2, steuersatz: 42 }
        : undefined,
    });

  const setTaxField = (field: keyof TaxInputs, value: number) => {
    if (s.extras.tax) s.patchExtras({ tax: { ...s.extras.tax, [field]: value } });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Identity */}
      <div className="flex flex-col gap-3">
        <FieldLabel label={t("add.name") + " *"}>
          <Input
            value={s.name}
            onChange={(e) => s.patch({ name: e.target.value })}
            placeholder={t("add.namePlaceholder")}
            className="bg-card border-border focus-visible:ring-1"
          />
        </FieldLabel>
        <FieldLabel label={t("add.address")}>
          <Input
            value={s.address}
            onChange={(e) => s.patch({ address: e.target.value })}
            placeholder={t("add.addressPlaceholder")}
            className="bg-card border-border focus-visible:ring-1"
          />
        </FieldLabel>
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <FieldLabel label={t("add.exposeUrl")}>
            <Input
              value={s.exposeUrl}
              onChange={(e) => s.patch({ exposeUrl: e.target.value })}
              placeholder="https://www.immobilienscout24.de/expose/..."
              className="bg-card border-border focus-visible:ring-1"
            />
          </FieldLabel>
          <FieldLabel label={t("fields.lage")}>
            <NativeSelect
              value={s.lage}
              onChange={(v) => s.patch({ lage: v })}
              options={["", ...LAGE_OPTIONS]}
            />
          </FieldLabel>
        </div>
      </div>

      {/* Objekt */}
      <InputSection title={t("sections.basics")} defaultOpen>
        <SliderInput
          label={t("add.price")}
          value={s.kaufpreis}
          onChange={(v) => s.patch({ kaufpreis: v })}
          min={20000}
          max={2000000}
          step={5000}
          unit="€"
          unitPosition="prefix"
        />
        <SliderInput
          label={t("add.area")}
          value={s.wohnflaeche}
          onChange={(v) => s.patch({ wohnflaeche: v })}
          min={10}
          max={400}
          step={1}
          unit=" m²"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField
            label={t("fields.rooms")}
            value={s.zimmer}
            onChange={(v) => s.patch({ zimmer: v ?? 0 })}
            step={0.5}
          />
          <NumberField
            label={t("fields.yearBuilt")}
            value={s.baujahr}
            onChange={(v) => s.patch({ baujahr: v ?? 0 })}
          />
        </div>
      </InputSection>

      {/* Kaufnebenkosten */}
      <InputSection title={t("sections.nebenkosten")} defaultOpen={false}>
        <div className="flex items-center justify-between -mb-1">
          <span className="text-xs text-amber-400 font-semibold tabular-nums">
            {formatPercent(nkTotalPct, 2)} = {formatCurrency(nkTotalEur, "de-DE", true)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("fields.provisionsfrei")}</span>
            <ToggleSwitch
              checked={provisionsfrei}
              onChange={(v) => {
                s.patchNebenkosten({ maklerprovisionPct: v ? 0 : 3.57 });
                s.patchDetails({ provisionsfrei: v });
              }}
            />
          </div>
        </div>
        <PercentEuroInput
          label={t("fields.grunderwerbsteuer")}
          value={s.extras.nebenkosten.grunderwerbsteuerPct}
          canonical="percent"
          base={s.kaufpreis}
          onChange={(v) => s.patchNebenkosten({ grunderwerbsteuerPct: v })}
        />
        <PercentEuroInput
          label={t("fields.notarGrundbuch")}
          value={s.extras.nebenkosten.notarGrundbuchPct}
          canonical="percent"
          base={s.kaufpreis}
          onChange={(v) => s.patchNebenkosten({ notarGrundbuchPct: v })}
        />
        <PercentEuroInput
          label={t("fields.maklerprovision")}
          value={s.extras.nebenkosten.maklerprovisionPct}
          canonical="percent"
          base={s.kaufpreis}
          onChange={(v) => s.patchNebenkosten({ maklerprovisionPct: v })}
        />
        <PercentEuroInput
          label={t("fields.sonstiges")}
          value={s.extras.nebenkosten.sonstigePct}
          canonical="percent"
          base={s.kaufpreis}
          onChange={(v) => s.patchNebenkosten({ sonstigePct: v })}
        />
      </InputSection>

      {/* Finanzierung (global) */}
      <InputSection title={t("sections.financing")} defaultOpen>
        <PercentEuroInput
          label={t("add.equity")}
          value={s.eigenanteil}
          canonical="euro"
          base={s.kaufpreis}
          onChange={(v) => s.patch({ eigenanteil: v })}
          info={t("fields.equityInfo")}
        />
        <div className="bg-muted/30 rounded-lg px-3 py-2.5 flex flex-col gap-1.5 text-xs">
          <p className="text-[11px] text-muted-foreground/80">{t("fields.financingGlobalHint")}</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("fields.zins")}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatPercent(g.zins, 2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("fields.tilgung")}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatPercent(g.tilgung, 2)}
            </span>
          </div>
        </div>
      </InputSection>

      {/* Miete & Bewirtschaftung */}
      <InputSection title={t("sections.rent")} defaultOpen>
        <SliderInput
          label={t("fields.istMiete")}
          value={s.istMiete}
          onChange={(v) => s.patch({ istMiete: v })}
          min={0}
          max={6000}
          step={10}
          unit="€"
          unitPosition="prefix"
          info={t("fields.istMieteInfo")}
        />
        <SliderInput
          label={t("fields.sollMiete")}
          value={s.sollMiete}
          onChange={(v) => s.patch({ sollMiete: v })}
          min={0}
          max={6000}
          step={10}
          unit="€"
          unitPosition="prefix"
          info={t("fields.sollMieteInfo")}
        />
        <PercentEuroInput
          label={t("fields.nichtUmlagefaehig")}
          value={s.extras.nichtUmlagefaehig}
          canonical="euro"
          base={rentBase}
          onChange={(v) => s.patchExtras({ nichtUmlagefaehig: v })}
        />
        <PercentEuroInput
          label={t("fields.ruecklagen")}
          value={s.extras.ruecklagen}
          canonical="euro"
          base={rentBase}
          onChange={(v) => s.patchExtras({ ruecklagen: v })}
        />
        <SliderInput
          label={t("fields.leerstand")}
          value={s.extras.leerstand}
          onChange={(v) => s.patchExtras({ leerstand: v })}
          min={0}
          max={20}
          step={0.5}
          unit="%"
        />
      </InputSection>

      {/* Steuer (optional) */}
      <InputSection title={t("sections.tax")} defaultOpen={false}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("fields.taxToggle")}</span>
          <ToggleSwitch checked={!!s.extras.tax} onChange={toggleTax} />
        </div>
        {s.extras.tax && (
          <div className="flex flex-col gap-4 pt-2 border-t border-border/60">
            <SliderInput
              label={t("fields.bemessungsgrundlage")}
              value={s.extras.tax.bemessungsgrundlage}
              onChange={(v) => setTaxField("bemessungsgrundlage", v)}
              min={0}
              max={2000000}
              step={5000}
              unit="€"
              unitPosition="prefix"
            />
            <SliderInput
              label={t("fields.gebaeudeanteil")}
              value={s.extras.tax.gebaeudeanteilPct}
              onChange={(v) => setTaxField("gebaeudeanteilPct", v)}
              min={0}
              max={100}
              step={1}
              unit="%"
            />
            <SliderInput
              label={t("fields.afa")}
              value={s.extras.tax.afaPct}
              onChange={(v) => setTaxField("afaPct", v)}
              min={0}
              max={5}
              step={0.5}
              unit="%"
            />
            <SliderInput
              label={t("fields.steuersatz")}
              value={s.extras.tax.steuersatz}
              onChange={(v) => setTaxField("steuersatz", v)}
              min={0}
              max={55}
              step={1}
              unit="%"
            />
          </div>
        )}
      </InputSection>

      {/* Wachstum (optional) */}
      <InputSection title={t("sections.growth")} defaultOpen={false}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("fields.growthToggle")}</span>
          <ToggleSwitch checked={growthEnabled} onChange={toggleGrowth} />
        </div>
        {growthEnabled && (
          <div className="flex flex-col gap-4 pt-2 border-t border-border/60">
            <SliderInput
              label={t("fields.mietentwicklung")}
              value={s.extras.mietentwicklung ?? 0}
              onChange={(v) => s.patchExtras({ mietentwicklung: v })}
              min={0}
              max={8}
              step={0.1}
              unit="%"
            />
            <SliderInput
              label={t("fields.wertentwicklung")}
              value={s.extras.wertentwicklung ?? 0}
              onChange={(v) => s.patchExtras({ wertentwicklung: v })}
              min={-2}
              max={10}
              step={0.1}
              unit="%"
            />
          </div>
        )}
      </InputSection>

      {/* Expose-Details */}
      <InputSection title={t("sections.details")} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField label={t("fields.etage")} value={s.details.etage ?? null} onChange={(v) => s.patchDetails({ etage: v })} allowEmpty />
          <NumberField label={t("fields.etagenGesamt")} value={s.details.etagenGesamt ?? null} onChange={(v) => s.patchDetails({ etagenGesamt: v })} allowEmpty />
          <NumberField label={t("fields.schlafzimmer")} value={s.details.schlafzimmer ?? null} onChange={(v) => s.patchDetails({ schlafzimmer: v })} allowEmpty />
          <NumberField label={t("fields.badezimmer")} value={s.details.badezimmer ?? null} onChange={(v) => s.patchDetails({ badezimmer: v })} allowEmpty />
          <NumberField label={t("fields.hausgeld")} value={s.details.hausgeld ?? null} onChange={(v) => s.patchDetails({ hausgeld: v })} unit="€" allowEmpty />
          <NumberField label={t("fields.stellplaetze")} value={s.details.stellplaetze ?? null} onChange={(v) => s.patchDetails({ stellplaetze: v })} allowEmpty />
          <NumberField label={t("fields.energieKennwert")} value={s.details.energieKennwert ?? null} onChange={(v) => s.patchDetails({ energieKennwert: v })} allowEmpty />
          <FieldLabel label={t("fields.energieKlasse")}>
            <NativeSelect
              value={s.details.energieKlasse ?? ""}
              onChange={(v) => s.patchDetails({ energieKlasse: v || null })}
              options={["", "A+", "A", "B", "C", "D", "E", "F", "G", "H"]}
            />
          </FieldLabel>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label={t("fields.wohnungstyp")} value={s.details.wohnungstyp ?? ""} onChange={(v) => s.patchDetails({ wohnungstyp: v || null })} />
          <TextField label={t("fields.objektzustand")} value={s.details.objektzustand ?? ""} onChange={(v) => s.patchDetails({ objektzustand: v || null })} />
          <TextField label={t("fields.ausstattung")} value={s.details.ausstattung ?? ""} onChange={(v) => s.patchDetails({ ausstattung: v || null })} />
          <TextField label={t("fields.heizungsart")} value={s.details.heizungsart ?? ""} onChange={(v) => s.patchDetails({ heizungsart: v || null })} />
          <TextField label={t("fields.energietraeger")} value={s.details.energietraeger ?? ""} onChange={(v) => s.patchDetails({ energietraeger: v || null })} />
          <TextField label={t("fields.energieausweistyp")} value={s.details.energieausweistyp ?? ""} onChange={(v) => s.patchDetails({ energieausweistyp: v || null })} />
          <TextField label={t("fields.maklerName")} value={s.details.maklerName ?? ""} onChange={(v) => s.patchDetails({ maklerName: v || null })} />
          <TextField label={t("fields.maklerTelefon")} value={s.details.maklerTelefon ?? ""} onChange={(v) => s.patchDetails({ maklerTelefon: v || null })} />
        </div>
      </InputSection>

      {/* Notizen */}
      <InputSection title={t("sections.notes")} defaultOpen={false}>
        <textarea
          value={s.notes}
          onChange={(e) => s.patch({ notes: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          placeholder={t("fields.notesPlaceholder")}
        />
      </InputSection>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  unit,
  allowEmpty = false,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  unit?: string;
  allowEmpty?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-muted-foreground">
        {label}
        {unit ? ` (${unit})` : ""}
      </Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(allowEmpty ? null : 0);
            return;
          }
          const v = parseFloat(raw);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="bg-card border-border focus-visible:ring-1"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card border-border focus-visible:ring-1"
      />
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "" ? "—" : o}
        </option>
      ))}
    </select>
  );
}
