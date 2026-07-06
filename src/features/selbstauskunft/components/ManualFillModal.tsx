"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Property, PropertyInputs, Json } from "@/lib/supabase";
import {
  REQUIREMENTS,
  type SaDocType,
  type SaLevel,
} from "@/lib/selbstauskunft/requirements";
import {
  docTypesFromMeta,
  type SaMeta,
} from "@/lib/selbstauskunft/completeness";

// Editable numeric inputs the user can fill by hand instead of uploading docs.
const FIELD_KEYS = [
  "kaufpreis",
  "eigenanteil",
  "zins",
  "tilgung",
  "zinsbindung",
  "kaltmiete",
  "nichtUmlagefaehig",
  "ruecklagen",
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

const LEVEL_DOT: Record<SaLevel, string> = {
  pflicht: "bg-red-500",
  empfohlen: "bg-orange-500",
  optional: "bg-yellow-500",
};

type Props = {
  property: Property;
  onClose: () => void;
  onSaved: (updated: Property) => void;
};

export function ManualFillModal({ property, onClose, onSaved }: Props) {
  const t = useTranslations("selbstauskunft.manual");
  const meta = property.inputs.selbstauskunft;

  const [vals, setVals] = useState<Record<FieldKey, string>>(
    () =>
      Object.fromEntries(
        FIELD_KEYS.map((k) => [k, String(property.inputs[k] ?? "")]),
      ) as Record<FieldKey, string>,
  );
  const [manualSet, setManualSet] = useState<Set<SaDocType>>(
    new Set(meta?.manual ?? []),
  );
  const [saving, setSaving] = useState(false);

  // Requirements not covered by an uploaded document → can be marked manually.
  const uploaded = new Set(docTypesFromMeta(meta));
  const overridable = REQUIREMENTS.filter((r) => !uploaded.has(r.docType));

  const toggle = (dt: SaDocType) =>
    setManualSet((prev) => {
      const next = new Set(prev);
      if (next.has(dt)) next.delete(dt);
      else next.add(dt);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const num = (s: string, fallback: number) => {
        const n = parseFloat(s.replace(",", "."));
        return Number.isFinite(n) ? n : fallback;
      };
      const newInputs: PropertyInputs = { ...property.inputs };
      for (const k of FIELD_KEYS) newInputs[k] = num(vals[k], property.inputs[k]);
      const newMeta: SaMeta = {
        docTypes: meta?.docTypes ?? {},
        manual: [...manualSet],
        updatedAt: new Date().toISOString(),
      };
      newInputs.selbstauskunft = newMeta;

      const sb = getSupabaseBrowserClient();
      await sb
        .from("properties")
        .update({ inputs: newInputs as unknown as Json })
        .eq("id", property.id);
      onSaved({ ...property, inputs: newInputs });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{property.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("cancel")}
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">{t("intro")}</p>

        {/* Editable data */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("dataTitle")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FIELD_KEYS.map((k) => (
              <div key={k} className="space-y-1">
                <label htmlFor={`mf-${k}`} className="block text-xs text-muted-foreground">
                  {t(`fields.${k}`)}
                </label>
                <input
                  id={`mf-${k}`}
                  type="number"
                  inputMode="decimal"
                  value={vals[k]}
                  onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
                  className="w-full rounded-lg bg-background border border-border px-2.5 py-1.5 text-sm outline-none focus:border-amber-500/60"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mark missing documents as manually provided */}
        {overridable.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("docsTitle")}
            </p>
            <ul className="space-y-1.5">
              {overridable.map((r) => (
                <li key={r.docType}>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualSet.has(r.docType)}
                      onChange={() => toggle(r.docType)}
                      className="mt-1 h-4 w-4 accent-amber-500"
                    />
                    <span className="flex items-start gap-2">
                      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", LEVEL_DOT[r.level])} />
                      <span>
                        <span className="font-medium">{r.label}</span>{" "}
                        <span className="text-muted-foreground">— {t("markPresent")}</span>
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 transition-colors"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
