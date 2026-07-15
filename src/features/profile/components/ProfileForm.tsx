"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ProfileFieldOption = {
  value: string;
  label: string;
  /** Optional one-liner shown under the label inside a choice card. */
  description?: string;
  icon?: LucideIcon;
};

export type ProfileFieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "month" | "select";
  options?: ProfileFieldOption[];
  placeholder?: string;
  suffix?: string;
  /** Helper text shown under the label to explain what the bank wants here. */
  description?: string;
  /**
   * For `select` fields: render as a row of choice cards (default) or a native
   * dropdown. Cards are the friendlier default for small option sets.
   */
  variant?: "cards" | "dropdown";
  /** Force the field onto its own full-width row. */
  fullWidth?: boolean;
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

  const rendersAsCards = (f: ProfileFieldConfig) =>
    f.type === "select" && f.variant !== "dropdown" && !!f.options;

  return (
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
              onClick={() =>
                setActive((a) => Math.min(groups.length - 1, a + 1))
              }
              disabled={isLast}
              className="flex items-center gap-1 text-sm font-medium text-[#6c5ce7] transition-colors hover:text-[#5b4bd6] disabled:pointer-events-none disabled:opacity-0"
            >
              Weiter
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
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
  const asCards =
    config.type === "select" && config.variant !== "dropdown" && config.options;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label
        htmlFor={asCards ? undefined : id}
        className="text-sm font-medium text-foreground"
      >
        {config.label}
      </Label>
      {config.description && (
        <p className="text-xs text-muted-foreground leading-snug">
          {config.description}
        </p>
      )}

      {asCards ? (
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
      {options.map((o) => {
        const selected = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? undefined : o.value)}
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
              {o.label}
            </span>
            {o.description && (
              <span className="text-[11px] leading-tight text-muted-foreground">
                {o.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
