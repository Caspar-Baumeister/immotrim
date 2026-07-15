"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A single extracted value with provenance, as returned by /api/extract.
export type ExtractedLike = {
  value: string | number;
  sourceDoc: string;
  confidence: number;
};

type Props = {
  // Ordered list of keys that actually came back from the model.
  keys: string[];
  // Resolves a key to its extracted value + provenance.
  fieldFor: (key: string) => ExtractedLike;
  // Human label for a key (feature-specific i18n).
  label: (key: string) => string;
  // The form's current value for a key, so the panel can diff old → new.
  currentValue: (key: string) => string | number | undefined;
  // Formats a value for display (€, m², %, plain …).
  formatValue: (key: string, value: string | number | undefined) => string;
  // Called with the user's selection when they click Apply / Apply all.
  onApply: (selectedKeys: string[]) => void;
};

// Generic diff/review panel shared by the property and Objektanalyse flows.
// It owns selection state and chrome; callers supply the field metadata and
// build their own patch from the returned keys.
export function ExtractionReviewPanel({
  keys,
  fieldFor,
  label,
  currentValue,
  formatValue,
  onApply,
}: Props) {
  const t = useTranslations("documents");

  // Default-select every field whose proposed value differs from the current one.
  const initialSelected = useMemo(() => {
    const s = new Set<string>();
    for (const k of keys) {
      if (fieldFor(k).value !== currentValue(k)) s.add(k);
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  if (keys.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        {t("review.noValues")}
      </div>
    );
  }

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="rounded-xl border border-[#6c5ce7]/30 bg-[#6c5ce7]/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#6c5ce7]/20 bg-[#6c5ce7]/[0.06]">
        <Sparkles className="h-3.5 w-3.5 text-[#6c5ce7]" />
        <span className="text-xs font-semibold text-[#6c5ce7]">
          {t("review.title", { count: keys.length })}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {t("review.subtitle")}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-border/50">
        {keys.map((key) => {
          const field = fieldFor(key);
          const cur = currentValue(key);
          const changed = field.value !== cur;
          const isSelected = selected.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                isSelected ? "bg-[#6c5ce7]/[0.05]" : "hover:bg-muted/30",
                !changed && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  isSelected
                    ? "bg-[#6c5ce7] border-[#6c5ce7] text-white"
                    : "border-border bg-background",
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>

              <span className="text-xs text-muted-foreground w-40 shrink-0">
                {label(key)}
              </span>

              <span className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground/70 tabular-nums truncate">
                  {formatValue(key, cur)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <span className="text-xs font-semibold text-foreground tabular-nums truncate">
                  {formatValue(key, field.value)}
                </span>
              </span>

              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5 max-w-32 truncate">
                  {field.sourceDoc}
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums rounded-full px-1.5 py-0.5",
                    field.confidence >= 0.75
                      ? "text-emerald-400 bg-emerald-500/10"
                      : field.confidence >= 0.4
                        ? "text-[#6c5ce7] bg-[#6c5ce7]/10"
                        : "text-red-400 bg-red-500/10",
                  )}
                >
                  {Math.round(field.confidence * 100)}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#6c5ce7]/20">
        <Button
          size="sm"
          onClick={() => onApply([...selected])}
          disabled={selected.size === 0}
          className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white"
        >
          {t("review.apply", { count: selected.size })}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onApply(keys)}>
          {t("review.applyAll")}
        </Button>
      </div>
    </div>
  );
}
