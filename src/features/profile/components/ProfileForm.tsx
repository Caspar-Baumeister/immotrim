"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ProfileFieldOption = {
  value: string;
  label: string;
  /** Optional one-liner shown under the label inside a choice card. */
  description?: string;
  icon?: LucideIcon;
};

export type EstimateTier = {
  label: string;
  amount: number;
  /** Replaces the € amount as the card's sub-line (e.g. "bereits im Netto enthalten"). */
  hint?: string;
};

export type EstimatePickItem = { id: string; label: string; amount: number };

/**
 * Inline standard-value helper for a number field. `tiers` = single-pick cards
 * that each map to a typical amount (e.g. household size → Lebenshaltung);
 * `multiPick` = a checklist whose typical amounts sum up (e.g. insurances).
 * Both keep a free-entry card so users can always type their own number.
 */
export type FieldEstimate =
  | {
      kind: "tiers";
      tiers: EstimateTier[];
      note?: string;
      customLabel?: string;
      placeholder?: string;
    }
  | {
      kind: "multiPick";
      items: EstimatePickItem[];
      note?: string;
      customLabel?: string;
      placeholder?: string;
    };

export type ProfileFieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "month" | "select";
  options?: ProfileFieldOption[];
  /**
   * For `number` fields: common values offered as quick-pick cards, with an
   * "Andere" card to type any other value.
   */
  presets?: number[];
  placeholder?: string;
  suffix?: string;
  /** Helper text shown under the label to explain what the bank wants here. */
  description?: string;
  /** Longer clarification revealed by an (i) icon next to the label. */
  info?: string;
  /**
   * For `select` fields: render as a row of choice cards (default) or a native
   * dropdown. Cards are the friendlier default for small option sets.
   */
  variant?: "cards" | "dropdown";
  /** Force the field onto its own full-width row. */
  fullWidth?: boolean;
  /**
   * Renders a special widget instead of a plain input. `benefit` = a yes/no
   * toggle that reveals count cards which multiply a per-unit amount (e.g.
   * Kindergeld = number of children × the statutory rate), with a manual
   * override. Stores the resulting monthly € amount.
   */
  widget?: "benefit";
  /** benefit widget: statutory amount per unit (e.g. € per child). */
  perUnit?: number;
  /** benefit widget: quick-pick unit counts (e.g. [1, 2, 3, 4]). */
  unitPresets?: number[];
  /** benefit widget: label on the enable toggle ("Ich beziehe Kindergeld"). */
  enableLabel?: string;
  /** benefit widget: unit noun, singular / plural ("Kind" / "Kinder"). */
  unitSingular?: string;
  unitPlural?: string;
  /** Standard-value quick-fill cards rendered instead of a plain input. */
  estimate?: FieldEstimate;
};

export type ProfileFieldGroup = {
  title?: string;
  /** Short intro shown at the top of the tab to set context. */
  description?: string;
  icon?: LucideIcon;
  fields: ProfileFieldConfig[];
};

type Values = Record<string, string | number | undefined>;

const hasValue = (v: string | number | undefined) =>
  v !== undefined && v !== null && v !== "";

// Config-driven form for the profile sections (Stammdaten, Haushaltsrechnung).
// Controlled: the page owns the values object and gets a (key, value) callback.
// Each group becomes a tab so a long form never shows as one intimidating wall.
export function ProfileForm({
  groups,
  values,
  onChange,
}: {
  groups: ProfileFieldGroup[];
  values: Values;
  onChange: (key: string, value: string | number | undefined) => void;
}) {
  const [active, setActive] = useState(0);

  // Per-tab progress (filled / total) drives the little indicator on each tab.
  const progress = useMemo(
    () =>
      groups.map((g) => {
        const total = g.fields.length;
        const filled = g.fields.filter((f) => hasValue(values[f.key])).length;
        return { total, filled, done: total > 0 && filled === total };
      }),
    [groups, values],
  );

  const group = groups[active];
  const isFirst = active === 0;
  const isLast = active === groups.length - 1;

  // "Weiter"/"Fertig" confirms the tab: €-amount fields the user skipped count
  // as an explicit 0 ("habe ich nicht"), so the tab can reach its check mark
  // without typing zeros by hand. Non-monetary numbers (e.g. Gehälter pro Jahr)
  // stay untouched — 0 would be wrong there, not "none".
  const confirmEmptyAsZero = () => {
    for (const f of group.fields) {
      if (f.type === "number" && f.suffix === "€" && !hasValue(values[f.key]))
        onChange(f.key, 0);
    }
  };

  const rendersAsCards = (f: ProfileFieldConfig) =>
    f.widget === "benefit" ||
    !!f.estimate ||
    (f.type === "select" && f.variant !== "dropdown" && !!f.options) ||
    (f.type === "number" && f.variant !== "dropdown" && !!f.presets);

  return (
    <TooltipProvider>
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g, i) => {
          const p = progress[i];
          const isActive = i === active;
          const Icon = g.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "group flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-[#6c5ce7]/40 bg-[#6c5ce7]/6 text-[#6c5ce7]"
                  : "border-transparent text-muted-foreground hover:bg-muted",
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{g.title ?? `Schritt ${i + 1}`}</span>
              <TabIndicator done={p.done} filled={p.filled} total={p.total} />
            </button>
          );
        })}
      </div>

      {/* Active tab panel */}
      <div className="pt-5">
        {group.description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-6">
            {group.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
          {group.fields.map((f) => (
            <FieldInput
              key={f.key}
              config={f}
              value={values[f.key]}
              onChange={(v) => onChange(f.key, v)}
              className={
                f.fullWidth || rendersAsCards(f) ? "sm:col-span-2" : undefined
              }
            />
          ))}
        </div>

        {/* Step navigation */}
        {groups.length > 1 && (
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            <button
              type="button"
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={isFirst}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>

            <div className="flex items-center gap-1.5">
              {groups.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === active
                      ? "w-5 bg-[#6c5ce7]"
                      : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                confirmEmptyAsZero();
                setActive((a) => Math.min(groups.length - 1, a + 1));
              }}
              disabled={isLast && progress[active].done}
              className="flex items-center gap-1 text-sm font-medium text-[#6c5ce7] transition-colors hover:text-[#5b4bd6] disabled:pointer-events-none disabled:opacity-0"
            >
              {isLast ? (
                <>
                  Fertig
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}

function TabIndicator({
  done,
  filled,
  total,
}: {
  done: boolean;
  filled: number;
  total: number;
}) {
  if (done) {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (filled === 0) return null;
  return (
    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
      {filled}/{total}
    </span>
  );
}

// Small (i) affordance next to a field label. Hover or keyboard-focus reveals a
// longer clarification the always-visible `description` line is too short for.
function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label="Mehr Informationen"
        className="text-muted-foreground/60 transition-colors hover:text-[#6c5ce7] focus-visible:text-[#6c5ce7] focus-visible:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function FieldInput({
  config,
  value,
  onChange,
  className,
}: {
  config: ProfileFieldConfig;
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  className?: string;
}) {
  const id = `field-${config.key}`;
  const asOptionCards =
    config.type === "select" && config.variant !== "dropdown" && config.options;
  const asNumberCards =
    config.type === "number" && config.variant !== "dropdown" && config.presets;
  const asBenefit = config.widget === "benefit";
  const estimate = config.estimate;
  const labelless = asOptionCards || asNumberCards || asBenefit || !!estimate;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label
          htmlFor={labelless ? undefined : id}
          className="text-sm font-medium text-foreground"
        >
          {config.label}
        </Label>
        {config.info && <InfoHint text={config.info} />}
      </div>
      {config.description && (
        <p className="text-xs text-muted-foreground leading-snug">
          {config.description}
        </p>
      )}

      {estimate ? (
        estimate.kind === "multiPick" ? (
          <MultiPickSumField
            value={value as number | undefined}
            onChange={onChange}
            items={estimate.items}
            note={estimate.note}
            customLabel={estimate.customLabel}
            placeholder={estimate.placeholder}
            suffix={config.suffix}
          />
        ) : (
          <TierEstimateField
            value={value as number | undefined}
            onChange={onChange}
            tiers={estimate.tiers}
            note={estimate.note}
            customLabel={estimate.customLabel}
            placeholder={estimate.placeholder}
            suffix={config.suffix}
          />
        )
      ) : asBenefit ? (
        <BenefitField
          value={value as number | undefined}
          onChange={onChange}
          perUnit={config.perUnit ?? 0}
          unitPresets={config.unitPresets ?? [1, 2, 3, 4]}
          enableLabel={config.enableLabel ?? "Ja, ich beziehe das"}
          unitSingular={config.unitSingular ?? "Einheit"}
          unitPlural={config.unitPlural ?? "Einheiten"}
          suffix={config.suffix}
        />
      ) : asNumberCards ? (
        <NumberChoiceCards
          presets={config.presets!}
          value={value as number | undefined}
          onChange={onChange}
          suffix={config.suffix}
        />
      ) : asOptionCards ? (
        <OptionCards
          options={config.options!}
          value={value as string | undefined}
          onChange={onChange}
        />
      ) : (
        <div className="relative flex items-center mt-0.5">
          {config.type === "select" ? (
            <select
              id={id}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value || undefined)}
              className={cn(
                "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            >
              <option value="">—</option>
              {config.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={id}
              type={
                config.type === "number"
                  ? "number"
                  : config.type === "date"
                    ? "date"
                    : config.type === "month"
                      ? "month"
                      : "text"
              }
              value={value ?? ""}
              placeholder={config.placeholder}
              onChange={(e) => {
                const raw = e.target.value;
                if (config.type === "number") {
                  onChange(raw === "" ? undefined : Number(raw));
                } else {
                  onChange(raw === "" ? undefined : raw);
                }
              }}
              className={cn("h-10 px-3", config.suffix && "pr-8")}
            />
          )}
          {config.suffix && config.type !== "select" && (
            <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none">
              {config.suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const eur = new Intl.NumberFormat("de-DE");

// One radio-style card. Shared by every card-based widget so they look identical.
function ChoiceCard({
  selected,
  label,
  description,
  icon: Icon,
  onClick,
  role = "radio",
}: {
  selected: boolean;
  label: string;
  description?: string;
  icon?: LucideIcon;
  onClick: () => void;
  role?: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex flex-1 min-w-32 flex-col items-center justify-center gap-1.5 rounded-xl border px-4 py-3.5 text-center transition-all",
        selected
          ? "border-[#6c5ce7] bg-[#6c5ce7]/5 ring-1 ring-[#6c5ce7]"
          : "border-border bg-card hover:border-[#6c5ce7]/40 hover:bg-muted/40",
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-5 w-5",
            selected ? "text-[#6c5ce7]" : "text-muted-foreground",
          )}
        />
      )}
      <span
        className={cn(
          "text-sm font-medium",
          selected ? "text-[#6c5ce7]" : "text-foreground",
        )}
      >
        {label}
      </span>
      {description && (
        <span className="text-[11px] leading-tight text-muted-foreground">
          {description}
        </span>
      )}
    </button>
  );
}

// A small € input with the suffix pinned inside — reused by the custom-value
// escape hatches below.
function AmountInput({
  value,
  placeholder,
  suffix,
  onChange,
}: {
  value: number | undefined;
  placeholder?: string;
  suffix?: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="relative flex items-center max-w-48">
      <Input
        type="number"
        autoFocus
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : Number(raw));
        }}
        className={cn("h-10 px-3", suffix && "pr-8")}
      />
      {suffix && (
        <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

// Radio-style choice cards — the friendly alternative to a dropdown for a small
// set of options. Clicking the selected card again clears it (fields optional).
function OptionCards({
  options,
  value,
  onChange,
}: {
  options: ProfileFieldOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5 mt-0.5">
      {options.map((o) => (
        <ChoiceCard
          key={o.value}
          selected={value === o.value}
          label={o.label}
          description={o.description}
          icon={o.icon}
          onClick={() => onChange(value === o.value ? undefined : o.value)}
        />
      ))}
    </div>
  );
}

// Number field as quick-pick cards (e.g. 12 / 13 Gehälter) plus an "Andere"
// card that reveals a free-entry field for any other value.
function NumberChoiceCards({
  presets,
  value,
  onChange,
  suffix,
}: {
  presets: number[];
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  suffix?: string;
}) {
  const has = hasValue(value);
  const inPreset = has && presets.includes(Number(value));
  const [customOpen, setCustomOpen] = useState(false);
  const showCustom = customOpen || (has && !inPreset);

  return (
    <div className="flex flex-col gap-2.5 mt-0.5">
      <div className="flex flex-wrap gap-2.5">
        {presets.map((n) => (
          <ChoiceCard
            key={n}
            selected={!showCustom && has && Number(value) === n}
            label={suffix ? `${eur.format(n)} ${suffix}` : String(n)}
            onClick={() => {
              setCustomOpen(false);
              onChange(has && Number(value) === n ? undefined : n);
            }}
          />
        ))}
        <ChoiceCard
          selected={showCustom}
          label="Andere"
          onClick={() => setCustomOpen(true)}
        />
      </div>
      {showCustom && (
        <AmountInput
          value={value}
          placeholder={suffix ? "Betrag mtl." : "z. B. 14"}
          suffix={suffix}
          onChange={onChange}
        />
      )}
    </div>
  );
}

// Benefit widget (e.g. Kindergeld): a Nein / Ja toggle, then count cards that
// multiply the statutory per-unit rate into a monthly amount, with a free-entry
// override. Stores the € amount: undefined = unanswered, 0 = explicitly "Nein".
function BenefitField({
  value,
  onChange,
  perUnit,
  unitPresets,
  enableLabel,
  unitSingular,
  unitPlural,
  suffix,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  perUnit: number;
  unitPresets: number[];
  enableLabel: string;
  unitSingular: string;
  unitPlural: string;
  suffix?: string;
}) {
  const receiving = value !== undefined && Number(value) > 0;
  const count =
    receiving && perUnit > 0 && Number(value) % perUnit === 0
      ? Number(value) / perUnit
      : null;
  const isPresetCount = count !== null && unitPresets.includes(count);
  const [customOpen, setCustomOpen] = useState(false);
  const showCustom = receiving && (customOpen || !isPresetCount);

  return (
    <div className="flex flex-col gap-3 mt-0.5">
      <div className="flex flex-wrap gap-2.5">
        <ChoiceCard
          selected={value === 0}
          label="Nein"
          onClick={() => {
            setCustomOpen(false);
            onChange(0);
          }}
        />
        <ChoiceCard
          selected={receiving}
          label={enableLabel}
          onClick={() => {
            setCustomOpen(false);
            if (!receiving) onChange(perUnit * (unitPresets[0] ?? 1));
          }}
        />
      </div>

      {receiving && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            Wie viele Kinder? Wir rechnen mit {eur.format(perUnit)} € pro Kind
            (Stand 2026) — du kannst den Betrag aber auch selbst eintragen.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {unitPresets.map((n) => (
              <ChoiceCard
                key={n}
                selected={!showCustom && count === n}
                label={`${n} ${n === 1 ? unitSingular : unitPlural}`}
                description={`${eur.format(n * perUnit)} €`}
                onClick={() => {
                  setCustomOpen(false);
                  onChange(n * perUnit);
                }}
              />
            ))}
            <ChoiceCard
              selected={showCustom}
              label="Andere Höhe"
              onClick={() => setCustomOpen(true)}
            />
          </div>
          {showCustom && (
            <AmountInput
              value={value}
              placeholder="Betrag mtl."
              suffix={suffix}
              onChange={(v) => onChange(v)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Standard-value cards for a single-pick estimate (e.g. household size →
// typical Lebenshaltung). Each tier stores its € amount directly; a custom
// card keeps free entry available. Re-clicking the selected tier clears it.
function TierEstimateField({
  value,
  onChange,
  tiers,
  note,
  customLabel,
  placeholder,
  suffix,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  tiers: EstimateTier[];
  note?: string;
  customLabel?: string;
  placeholder?: string;
  suffix?: string;
}) {
  const has = hasValue(value);
  const matchIdx = has ? tiers.findIndex((t) => t.amount === Number(value)) : -1;
  const [customOpen, setCustomOpen] = useState(false);
  const showCustom = customOpen || (has && matchIdx === -1);

  return (
    <div className="flex flex-col gap-2.5 mt-0.5">
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="flex flex-wrap gap-2.5">
        {tiers.map((t, i) => (
          <ChoiceCard
            key={t.label}
            selected={!showCustom && matchIdx === i}
            label={t.label}
            description={t.hint ?? `${eur.format(t.amount)} €`}
            onClick={() => {
              setCustomOpen(false);
              onChange(!showCustom && matchIdx === i ? undefined : t.amount);
            }}
          />
        ))}
        <ChoiceCard
          selected={showCustom}
          label={customLabel ?? "Andere"}
          onClick={() => setCustomOpen(true)}
        />
      </div>
      {showCustom && (
        <AmountInput
          value={has ? Number(value) : undefined}
          placeholder={placeholder}
          suffix={suffix}
          onChange={onChange}
        />
      )}
    </div>
  );
}

// Checklist estimate (e.g. insurances): tick what applies, typical monthly
// amounts sum into the stored value. Which items were ticked is UI-only state —
// only the € sum persists, so a saved value can't be split back into items and
// loads (also after a tab switch remounts the widget) as the custom card.
function MultiPickSumField({
  value,
  onChange,
  items,
  note,
  customLabel,
  placeholder,
  suffix,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  items: EstimatePickItem[];
  note?: string;
  customLabel?: string;
  placeholder?: string;
  suffix?: string;
}) {
  const has = hasValue(value);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [customOpen, setCustomOpen] = useState(() => has);
  const showCustom = customOpen;
  const sumOf = (set: Set<string>) =>
    items.reduce((acc, i) => (set.has(i.id) ? acc + i.amount : acc), 0);

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    setCustomOpen(false);
    onChange(next.size === 0 ? undefined : sumOf(next));
  };

  return (
    <div className="flex flex-col gap-2.5 mt-0.5">
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="flex flex-wrap gap-2.5">
        {items.map((i) => (
          <ChoiceCard
            key={i.id}
            role="checkbox"
            selected={!showCustom && checked.has(i.id)}
            label={i.label}
            description={`~${eur.format(i.amount)} € mtl.`}
            onClick={() => toggle(i.id)}
          />
        ))}
        <ChoiceCard
          selected={showCustom}
          label={customLabel ?? "Eigener Betrag"}
          onClick={() => setCustomOpen(true)}
        />
      </div>
      {!showCustom && checked.size > 0 && (
        <p className="text-xs text-muted-foreground">
          Summe:{" "}
          <span className="font-semibold text-[#6c5ce7]">
            {eur.format(sumOf(checked))} € mtl.
          </span>
        </p>
      )}
      {showCustom && (
        <AmountInput
          value={has ? Number(value) : undefined}
          placeholder={placeholder}
          suffix={suffix}
          onChange={onChange}
        />
      )}
    </div>
  );
}
