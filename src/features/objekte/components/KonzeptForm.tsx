"use client";

// Shared form for /konzepte/new and /konzepte/[id]: Grunddaten and
// Finanzierungswunsch. Objects live in their own section (ObjekteSection) —
// a concept is a strategy; its candidate objects are separate rows.
// Follows the setField patch-state pattern of the profile section pages.

import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  inputClass,
  textareaClass,
  NumberField,
  SectionCard,
  TextField,
} from "./fields";
import {
  KONZEPT_TYPES,
  KONZEPT_TYPE_LABELS,
  KONZEPT_ZWECKE,
  KONZEPT_ZWECK_LABELS,
  type KonzeptDraft,
  type KonzeptFinanzierung,
  type KonzeptType,
  type KonzeptZweck,
} from "../types";

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
  const setField = (patch: Partial<KonzeptDraft>) => onChange({ ...draft, ...patch });
  const setFin = (patch: Partial<KonzeptFinanzierung>) =>
    setField({ finanzierung: { ...draft.finanzierung, ...patch } });

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
            placeholder="Beschreibe das Konzept so, wie du es der Bank erklären würdest: Zielgruppe, geplante Vermietung, welche Art Objekt du suchst …"
            className={textareaClass}
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
