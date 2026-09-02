"use client";

// Overview of all objects: one card per object with the bank-relevant key data,
// financing need and the status of its bank requests. "Neues Objekt" creates an
// empty row immediately (so uploads have a real object_id target) and jumps to
// the detail page.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  DoorOpen,
  Euro,
  HandCoins,
  Landmark,
  Loader2,
  MapPin,
  Plus,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { createObjekt, listObjekte } from "@/features/objekte/objekt-service";
import { objektLabel, type Objekt } from "@/features/objekte/types";
import {
  ANFRAGE_STATUS_LABELS,
  listAllRequests,
  type BankRequest,
} from "@/features/anfrage/request-service";
import { getBank } from "@/features/banks/registry";

const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3 text-[#6c5ce7]" />
      <span className="text-foreground font-medium">{children}</span>
    </span>
  );
}

export default function ObjektePage() {
  const router = useRouter();
  const [objekte, setObjekte] = useState<Objekt[]>([]);
  const [requests, setRequests] = useState<BankRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([listObjekte(), listAllRequests()]).then(([os, rs]) => {
      setObjekte(os);
      setRequests(rs);
      setLoading(false);
    });
  }, []);

  const handleAdd = async () => {
    setCreating(true);
    try {
      const objectId = await createObjekt();
      router.push(`/objekte/${objectId}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Objekte" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold font-heading text-foreground">
              Deine Objekte
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Ein Objekt pro Kaufkandidat: Lade das Exposé hoch, sammle die
              Objektunterlagen und lege den Finanzierungsbedarf fest — daraus
              entsteht pro Bank die fertige Finanzierungsanfrage.
            </p>
          </div>
          <Button
            onClick={handleAdd}
            disabled={creating}
            className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Neues Objekt
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : objekte.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-foreground">Noch kein Objekt angelegt.</p>
            <p className="text-xs text-muted-foreground max-w-md">
              Sobald du ein passendes Objekt gefunden hast, lege es hier an und lade
              das Exposé hoch — die KI liest die Eckdaten für die Bank aus.
            </p>
            <Button
              onClick={handleAdd}
              disabled={creating}
              className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5 mt-1"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Erstes Objekt anlegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {objekte.map((o) => {
              const oRequests = requests.filter(
                (r) => r.objectId === o.id && r.status !== "entwurf",
              );
              return (
                <div
                  key={o.id}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-foreground/15 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {objektLabel(o)}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {o.data.kaufpreis != null && (
                      <Chip icon={Euro}>{nf0.format(o.data.kaufpreis)} €</Chip>
                    )}
                    {o.data.wohnflaeche != null && (
                      <Chip icon={Ruler}>{nf0.format(o.data.wohnflaeche)} m²</Chip>
                    )}
                    {o.data.zimmer != null && (
                      <Chip icon={DoorOpen}>{o.data.zimmer} Zi.</Chip>
                    )}
                    {o.data.baujahr != null && (
                      <Chip icon={CalendarDays}>{o.data.baujahr}</Chip>
                    )}
                    {o.data.ort && <Chip icon={MapPin}>{o.data.ort}</Chip>}
                    {o.finanzierung.darlehensbetrag != null && (
                      <Chip icon={HandCoins}>
                        {nf0.format(o.finanzierung.darlehensbetrag)} € Darlehen
                      </Chip>
                    )}
                  </div>
                  {oRequests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {oRequests.map((r) => (
                        <span
                          key={r.bankId}
                          className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {getBank(r.bankId)?.shortName ?? r.bankId}:{" "}
                          {ANFRAGE_STATUS_LABELS[r.status]}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center gap-4 pt-1">
                    <Link
                      href={`/objekte/${o.id}`}
                      className="text-xs text-[#6c5ce7] hover:underline"
                    >
                      Objekt öffnen
                    </Link>
                    <Link
                      href={`/banken?objekt=${o.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-[#6c5ce7] hover:underline"
                    >
                      <Landmark className="h-3.5 w-3.5" /> Banken
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
