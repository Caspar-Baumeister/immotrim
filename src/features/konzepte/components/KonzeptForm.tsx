"use client";

// Shared form for /konzepte/new and /konzepte/[id]: Grunddaten, Objekt (inline
// or prefilled from an Objektanalyse row) and Finanzierungswunsch. Follows the
// setField patch-state pattern of the profile section pages (strategie/page.tsx).

import { useEffect, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getAllWishlistProperties } from "@/features/wishlist/wishlist-service";
import type { WishlistProperty } from "@/features/wishlist/types";
import {
  KONZEPT_TYPES,
  KONZEPT_TYPE_LABELS,
  KONZEPT_ZWECKE,
  KONZEPT_ZWECK_LABELS,
  prefillFromWishlist,
  type KonzeptDraft,
  type KonzeptFinanzierung,
  type KonzeptObjekt,
  type KonzeptType,
  type KonzeptZweck,
} from "../types";

const inputClass = cn(
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const textareaClass = cn(
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y",
);

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
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

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </Label>
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

export function KonzeptForm({
  draft,
  onChange,
  onSave,
  saving,
  saved,
}: {
  draft: KonzeptDraft;
  onChange: (next: KonzeptDraft) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [wishlist, setWishlist] = useState<WishlistProperty[]>([]);

  useEffect(() => {
    getAllWishlistProperties().then(setWishlist);
  }, []);

  const setField = (patch: Partial<KonzeptDraft>) => onChange({ ...draft, ...patch });
  const setObjekt = (patch: Partial<KonzeptObjekt>) =>
    setField({ objekt: { ...draft.objekt, ...patch } });
  const setFin = (patch: Partial<KonzeptFinanzierung>) =>
    setField({ finanzierung: { ...draft.finanzierung, ...patch } });

  const applyWishlist = (id: string) => {
    if (!id) {
      setField({ wishlistPropertyId: null });
      return;
    }
    const w = wishlist.find((x) => x.id === id);
    if (!w) return;
    setField({ wishlistPropertyId: id, objekt: { ...draft.objekt, ...prefillFromWishlist(w) } });
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Grunddaten">
        <TextField
          id="konzept-title"
          label="Titel des Konzepts"
          value={draft.title || undefined}
          onChange={(v) => setField({ title: v ?? "" })}
          placeholder="z.B. Möbliertes 1-Zimmer-Apartment in Potsdam"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="konzept-type" className="text-xs text-muted-foreground">
              Konzepttyp
            </Label>
            <select
              id="konzept-type"
              value={draft.conceptType ?? ""}
              onChange={(e) =>
                setField({ conceptType: (e.target.value || undefined) as KonzeptType | undefined })
              }
              className={inputClass}
            >
              <option value="">– auswählen –</option>
              {KONZEPT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {KONZEPT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="konzept-desc" className="text-xs text-muted-foreground">
            Beschreibung
          </Label>
          <textarea
            id="konzept-desc"
            value={draft.description ?? ""}
            onChange={(e) => setField({ description: e.target.value || undefined })}
            rows={4}
            placeholder="Beschreibe das Konzept so, wie du es der Bank erklären würdest: Zielgruppe, geplante Vermietung, warum das Objekt dazu passt …"
            className={textareaClass}
          />
        </div>
      </SectionCard>

      <SectionCard title="Objekt">
        {wishlist.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="konzept-wishlist" className="text-xs text-muted-foreground">
              Aus Objektanalyse übernehmen (optional)
            </Label>
            <select
              id="konzept-wishlist"
              value={draft.wishlistPropertyId ?? ""}
              onChange={(e) => applyWishlist(e.target.value)}
              className={inputClass}
            >
              <option value="">– kein Objekt verknüpft –</option>
              {wishlist.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="objekt-adresse"
            label="Straße, Hausnummer"
            value={draft.objekt.adresse}
            onChange={(v) => setObjekt({ adresse: v })}
          />
          <TextField
            id="objekt-ort"
            label="PLZ, Ort"
            value={draft.objekt.ort}
            onChange={(v) => setObjekt({ ort: v })}
          />
          <TextField
            id="objekt-typ"
            label="Objektart"
            value={draft.objekt.objekttyp}
            onChange={(v) => setObjekt({ objekttyp: v })}
            placeholder="z.B. Eigentumswohnung"
          />
          <NumberField
            id="objekt-flaeche"
            label="Wohnfläche"
            suffix="m²"
            value={draft.objekt.wohnflaeche}
            onChange={(v) => setObjekt({ wohnflaeche: v })}
          />
          <NumberField
            id="objekt-zimmer"
            label="Zimmer"
            value={draft.objekt.zimmer}
            onChange={(v) => setObjekt({ zimmer: v })}
          />
          <NumberField
            id="objekt-baujahr"
            label="Baujahr"
            value={draft.objekt.baujahr}
            onChange={(v) => setObjekt({ baujahr: v })}
          />
          <NumberField
            id="objekt-kaufpreis"
            label="Kaufpreis"
            suffix="€"
            value={draft.objekt.kaufpreis}
            onChange={(v) => setObjekt({ kaufpreis: v })}
          />
          <NumberField
            id="objekt-miete"
            label="Erwartete Kaltmiete"
            suffix="€/Monat"
            value={draft.objekt.erwarteteMiete}
            onChange={(v) => setObjekt({ erwarteteMiete: v })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Finanzierungswunsch">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fin-zweck" className="text-xs text-muted-foreground">
              Zweck
            </Label>
            <select
              id="fin-zweck"
              value={draft.finanzierung.zweck ?? ""}
              onChange={(e) =>
                setFin({ zweck: (e.target.value || undefined) as KonzeptZweck | undefined })
              }
              className={inputClass}
            >
              <option value="">– auswählen –</option>
              {KONZEPT_ZWECKE.map((z) => (
                <option key={z} value={z}>
                  {KONZEPT_ZWECK_LABELS[z]}
                </option>
              ))}
            </select>
          </div>
          <NumberField
            id="fin-darlehen"
            label="Gewünschter Darlehensbetrag"
            suffix="€"
            value={draft.finanzierung.darlehensbetrag}
            onChange={(v) => setFin({ darlehensbetrag: v })}
          />
          <NumberField
            id="fin-ek"
            label="Eingebrachtes Eigenkapital"
            suffix="€"
            value={draft.finanzierung.eigenkapital}
            onChange={(v) => setFin({ eigenkapital: v })}
          />
          <NumberField
            id="fin-zinsbindung"
            label="Zinsbindung"
            suffix="Jahre"
            value={draft.finanzierung.zinsbindungJahre}
            onChange={(v) => setFin({ zinsbindungJahre: v })}
          />
          <NumberField
            id="fin-tilgung"
            label="Anfängliche Tilgung"
            suffix="% p.a."
            value={draft.finanzierung.tilgungPct}
            onChange={(v) => setFin({ tilgungPct: v })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fin-wuensche" className="text-xs text-muted-foreground">
            Weitere Wünsche
          </Label>
          <textarea
            id="fin-wuensche"
            value={draft.finanzierung.wuensche ?? ""}
            onChange={(e) => setFin({ wuensche: e.target.value || undefined })}
            rows={3}
            placeholder="z.B. Sondertilgungen, KfW-Förderung, tilgungsfreie Anlaufjahre …"
            className={textareaClass}
          />
        </div>
      </SectionCard>

      <div className="flex items-center gap-3">
        <Button
          onClick={onSave}
          disabled={saving || !draft.title.trim()}
          className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Speichern
        </Button>
        {saved && (
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Gespeichert
          </span>
        )}
        {!draft.title.trim() && (
          <span className="text-xs text-muted-foreground">Gib dem Konzept einen Titel.</span>
        )}
      </div>
    </div>
  );
}
