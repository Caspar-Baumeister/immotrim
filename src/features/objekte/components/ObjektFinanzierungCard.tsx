"use client";

// Finanzierungsbedarf of one object (extracted from the former KonzeptForm's
// "Finanzierungswunsch" card): purpose, loan amount, equity, terms and free-text
// wishes. Patch-callback style like ObjektForm; the page owns saving.

import { Label } from "@/components/ui/label";
import { inputClass, textareaClass, NumberField, SectionCard } from "./fields";
import { ZWECKE, ZWECK_LABELS, type ObjektFinanzierung, type Zweck } from "../types";

export function ObjektFinanzierungCard({
  finanzierung,
  onChange,
}: {
  finanzierung: ObjektFinanzierung;
  onChange: (patch: Partial<ObjektFinanzierung>) => void;
}) {
  return (
    <SectionCard title="Finanzierungsbedarf">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fin-zweck" className="text-xs text-muted-foreground">
            Zweck
          </Label>
          <select
            id="fin-zweck"
            value={finanzierung.zweck ?? ""}
            onChange={(e) =>
              onChange({ zweck: (e.target.value || undefined) as Zweck | undefined })
            }
            className={inputClass}
          >
            <option value="">– auswählen –</option>
            {ZWECKE.map((z) => (
              <option key={z} value={z}>
                {ZWECK_LABELS[z]}
              </option>
            ))}
          </select>
        </div>
        <NumberField
          id="fin-darlehen"
          label="Gewünschter Darlehensbetrag"
          suffix="€"
          value={finanzierung.darlehensbetrag}
          onChange={(v) => onChange({ darlehensbetrag: v })}
        />
        <NumberField
          id="fin-ek"
          label="Eingebrachtes Eigenkapital"
          suffix="€"
          value={finanzierung.eigenkapital}
          onChange={(v) => onChange({ eigenkapital: v })}
        />
        <NumberField
          id="fin-zinsbindung"
          label="Zinsbindung"
          suffix="Jahre"
          value={finanzierung.zinsbindungJahre}
          onChange={(v) => onChange({ zinsbindungJahre: v })}
        />
        <NumberField
          id="fin-tilgung"
          label="Anfängliche Tilgung"
          suffix="% p.a."
          value={finanzierung.tilgungPct}
          onChange={(v) => onChange({ tilgungPct: v })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fin-wuensche" className="text-xs text-muted-foreground">
          Weitere Wünsche
        </Label>
        <textarea
          id="fin-wuensche"
          value={finanzierung.wuensche ?? ""}
          onChange={(e) => onChange({ wuensche: e.target.value || undefined })}
          rows={3}
          placeholder="z.B. Sondertilgungen, KfW-Förderung, tilgungsfreie Anlaufjahre …"
          className={textareaClass}
        />
      </div>
    </SectionCard>
  );
}
