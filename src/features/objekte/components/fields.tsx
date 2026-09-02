"use client";

// Shared form primitives of the konzepte feature (KonzeptForm + ObjektForm):
// labelled text/number inputs with an optional semantic icon in the label row,
// plus the SectionCard wrapper.

import type { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const inputClass = cn(
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export const textareaClass = cn(
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y",
);

export function FieldLabel({
  htmlFor,
  icon: Icon,
  children,
}: {
  htmlFor: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      {Icon && <Icon className="h-3.5 w-3.5 text-[#6c5ce7]" />}
      {children}
    </Label>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} icon={icon}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
  icon,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  placeholder?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} icon={icon}>
        {label}
        {suffix ? ` (${suffix})` : ""}
      </FieldLabel>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : Number(v));
        }}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
