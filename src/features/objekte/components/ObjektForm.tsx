"use client";

// Editable form of one concept object: the bank-relevant core fields with
// semantic icons, plus a collapsible "Weitere Details" area for the extras that
// the exposé extraction fills (hausgeld, energie, makler, …).

import { useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  DoorOpen,
  Euro,
  HandCoins,
  MapPin,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass, NumberField, SectionCard, TextField } from "./fields";
import type { KonzeptObjekt, KonzeptObjektDetails } from "../types";

export function ObjektForm({
  data,
  details,
  onDataChange,
  onDetailsChange,
}: {
  data: KonzeptObjekt;
  details: KonzeptObjektDetails;
  onDataChange: (patch: Partial<KonzeptObjekt>) => void;
  onDetailsChange: (patch: Partial<KonzeptObjektDetails>) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = Object.values(details).some((v) => v !== undefined && v !== "");

  return (
    <SectionCard title="Objektdaten">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="objekt-adresse"
          label="Straße, Hausnummer"
          icon={MapPin}
          value={data.adresse}
          onChange={(v) => onDataChange({ adresse: v })}
        />
        <TextField
          id="objekt-ort"
          label="PLZ, Ort"
          icon={MapPin}
          value={data.ort}
          onChange={(v) => onDataChange({ ort: v })}
        />
        <TextField
          id="objekt-typ"
          label="Objektart"
          icon={Building2}
          value={data.objekttyp}
          onChange={(v) => onDataChange({ objekttyp: v })}
          placeholder="z.B. Eigentumswohnung"
        />
        <NumberField
          id="objekt-flaeche"
          label="Wohnfläche"
          suffix="m²"
          icon={Ruler}
          value={data.wohnflaeche}
          onChange={(v) => onDataChange({ wohnflaeche: v })}
        />
        <NumberField
          id="objekt-zimmer"
          label="Zimmer"
          icon={DoorOpen}
          value={data.zimmer}
          onChange={(v) => onDataChange({ zimmer: v })}
        />
        <NumberField
          id="objekt-baujahr"
          label="Baujahr"
          icon={CalendarDays}
          value={data.baujahr}
          onChange={(v) => onDataChange({ baujahr: v })}
        />
        <NumberField
          id="objekt-kaufpreis"
          label="Kaufpreis"
          suffix="€"
          icon={Euro}
          value={data.kaufpreis}
          onChange={(v) => onDataChange({ kaufpreis: v })}
        />
        <NumberField
          id="objekt-miete"
          label="Erwartete Kaltmiete"
          suffix="€/Monat"
          icon={HandCoins}
          value={data.erwarteteMiete}
          onChange={(v) => onDataChange({ erwarteteMiete: v })}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((s) => !s)}
        className="flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", showDetails && "rotate-180")}
        />
        Weitere Details
        {hasDetails && !showDetails && (
          <span className="rounded-full bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 px-1.5 py-px text-[10px] text-[#6c5ce7]">
            ausgefüllt
          </span>
        )}
      </button>

      {showDetails && (
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            id="objekt-hausgeld"
            label="Hausgeld"
            suffix="€/Monat"
            value={details.hausgeld}
            onChange={(v) => onDetailsChange({ hausgeld: v })}
          />
          <NumberField
            id="objekt-stellplaetze"
            label="Stellplätze"
            value={details.stellplaetze}
            onChange={(v) => onDetailsChange({ stellplaetze: v })}
          />
          <NumberField
            id="objekt-etage"
            label="Etage"
            value={details.etage}
            onChange={(v) => onDetailsChange({ etage: v })}
          />
          <NumberField
            id="objekt-etagen-gesamt"
            label="Etagen gesamt"
            value={details.etagenGesamt}
            onChange={(v) => onDetailsChange({ etagenGesamt: v })}
          />
          <NumberField
            id="objekt-schlafzimmer"
            label="Schlafzimmer"
            value={details.schlafzimmer}
            onChange={(v) => onDetailsChange({ schlafzimmer: v })}
          />
          <NumberField
            id="objekt-badezimmer"
            label="Badezimmer"
            value={details.badezimmer}
            onChange={(v) => onDetailsChange({ badezimmer: v })}
          />
          <TextField
            id="objekt-zustand"
            label="Objektzustand"
            value={details.objektzustand}
            onChange={(v) => onDetailsChange({ objektzustand: v })}
            placeholder="z.B. Gepflegt"
          />
          <TextField
            id="objekt-ausstattung"
            label="Ausstattung"
            value={details.ausstattung}
            onChange={(v) => onDetailsChange({ ausstattung: v })}
            placeholder="z.B. Gehoben"
          />
          <TextField
            id="objekt-heizung"
            label="Heizungsart"
            value={details.heizungsart}
            onChange={(v) => onDetailsChange({ heizungsart: v })}
          />
          <TextField
            id="objekt-energietraeger"
            label="Energieträger"
            value={details.energietraeger}
            onChange={(v) => onDetailsChange({ energietraeger: v })}
          />
          <TextField
            id="objekt-energieausweis"
            label="Energieausweistyp"
            value={details.energieausweistyp}
            onChange={(v) => onDetailsChange({ energieausweistyp: v })}
          />
          <NumberField
            id="objekt-energiekennwert"
            label="Energiekennwert"
            suffix="kWh/m²·a"
            value={details.energieKennwert}
            onChange={(v) => onDetailsChange({ energieKennwert: v })}
          />
          <TextField
            id="objekt-energieklasse"
            label="Energieklasse"
            value={details.energieKlasse}
            onChange={(v) => onDetailsChange({ energieKlasse: v })}
            placeholder="A+ bis H"
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="objekt-provisionsfrei"
              className="text-xs text-muted-foreground"
            >
              Provisionsfrei
            </label>
            <select
              id="objekt-provisionsfrei"
              value={
                details.provisionsfrei == null
                  ? ""
                  : details.provisionsfrei
                    ? "ja"
                    : "nein"
              }
              onChange={(e) =>
                onDetailsChange({
                  provisionsfrei:
                    e.target.value === "" ? undefined : e.target.value === "ja",
                })
              }
              className={inputClass}
            >
              <option value="">– unbekannt –</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </div>
          <TextField
            id="objekt-makler"
            label="Makler"
            value={details.maklerName}
            onChange={(v) => onDetailsChange({ maklerName: v })}
          />
          <TextField
            id="objekt-makler-tel"
            label="Makler-Telefon"
            value={details.maklerTelefon}
            onChange={(v) => onDetailsChange({ maklerTelefon: v })}
          />
          <TextField
            id="objekt-expose-url"
            label="Exposé-URL"
            value={details.exposeUrl}
            onChange={(v) => onDetailsChange({ exposeUrl: v })}
            placeholder="https://www.immobilienscout24.de/expose/…"
          />
        </div>
      )}
    </SectionCard>
  );
}
