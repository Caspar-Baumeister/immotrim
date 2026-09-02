"use client";

// "Objekte" section on the concept detail page: the concept's candidate
// objects as summary cards with icon-value chips, plus "Objekt hinzufügen"
// (creates an empty row immediately so uploads have a real object_id target).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  DoorOpen,
  Euro,
  Loader2,
  MapPin,
  Plus,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createConceptObject,
  listConceptObjects,
} from "../objekt-service";
import { objektLabel, type ConceptObject } from "../types";

const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3 text-[#6c5ce7]" />
      <span className="text-foreground font-medium">{children}</span>
    </span>
  );
}

export function ObjekteSection({ conceptId }: { conceptId: string }) {
  const router = useRouter();
  const [objects, setObjects] = useState<ConceptObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listConceptObjects(conceptId).then((os) => {
      setObjects(os);
      setLoading(false);
    });
  }, [conceptId]);

  const handleAdd = async () => {
    setCreating(true);
    try {
      const objectId = await createConceptObject(conceptId);
      router.push(`/konzepte/${conceptId}/objekte/${objectId}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Objekte</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kandidaten für dieses Konzept. Lade pro Objekt das Exposé hoch — beim
            Senden an eine Bank wählst du eines davon aus.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={creating}
          className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Objekt hinzufügen
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#6c5ce7]" />
        </div>
      ) : objects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-foreground">Noch kein Objekt in diesem Konzept.</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Sobald du ein passendes Objekt gefunden hast, füge es hinzu und lade das
            Exposé hoch — die KI liest die Eckdaten für die Bank aus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {objects.map((o) => (
            <Link
              key={o.id}
              href={`/konzepte/${conceptId}/objekte/${o.id}`}
              className="group rounded-xl border border-border bg-background/40 p-4 flex flex-col gap-2.5 hover:border-[#6c5ce7]/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground truncate">
                  {objektLabel(o)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#6c5ce7] transition-colors" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {o.data.kaufpreis != null && (
                  <Chip icon={Euro}>{nf0.format(o.data.kaufpreis)} €</Chip>
                )}
                {o.data.wohnflaeche != null && (
                  <Chip icon={Ruler}>{nf0.format(o.data.wohnflaeche)} m²</Chip>
                )}
                {o.data.zimmer != null && <Chip icon={DoorOpen}>{o.data.zimmer} Zi.</Chip>}
                {o.data.baujahr != null && <Chip icon={CalendarDays}>{o.data.baujahr}</Chip>}
                {o.data.ort && <Chip icon={MapPin}>{o.data.ort}</Chip>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
