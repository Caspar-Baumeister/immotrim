"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Lightbulb, Loader2, Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { getAllKonzepte } from "@/features/konzepte/konzept-service";
import { KONZEPT_TYPE_LABELS, type Konzept } from "@/features/konzepte/types";
import {
  ANFRAGE_STATUS_LABELS,
  listAllRequests,
  type BankRequest,
} from "@/features/anfrage/request-service";
import { getBank } from "@/features/banks/registry";

const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

export default function KonzeptePage() {
  const [konzepte, setKonzepte] = useState<Konzept[]>([]);
  const [requests, setRequests] = useState<BankRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllKonzepte(), listAllRequests()]).then(([ks, rs]) => {
      setKonzepte(ks);
      setRequests(rs);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Konzepte" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold font-heading text-foreground">
              Finanzierungskonzepte
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Ein Konzept pro Vorhaben: beschreibe, was du kaufen und wie du finanzieren
              willst, sammle die Objektunterlagen dazu — und erstelle daraus pro Bank
              die fertige Finanzierungsanfrage.
            </p>
          </div>
          <Link href="/konzepte/new">
            <Button className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5">
              <Plus className="h-4 w-4" /> Neues Konzept
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : konzepte.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-foreground">Noch kein Konzept angelegt.</p>
            <p className="text-xs text-muted-foreground max-w-md">
              Lege für jede Idee ein eigenes Konzept an — z.B. „Möbliertes
              1-Zimmer-Apartment“ oder „WG-Konzept“ — damit jede Bankanfrage sauber auf
              den Punkt kommt.
            </p>
            <Link href="/konzepte/new">
              <Button className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5 mt-1">
                <Plus className="h-4 w-4" /> Erstes Konzept anlegen
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {konzepte.map((k) => {
              const kRequests = requests.filter(
                (r) => r.conceptId === k.id && r.status !== "entwurf",
              );
              return (
                <div
                  key={k.id}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-foreground/15 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {k.title}
                      </h3>
                      {k.conceptType && (
                        <span className="inline-block mt-1 rounded-full bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 px-2 py-0.5 text-[10px] text-[#6c5ce7]">
                          {KONZEPT_TYPE_LABELS[k.conceptType]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {k.objekt.kaufpreis ? (
                      <span>
                        Kaufpreis{" "}
                        <span className="text-foreground font-medium">
                          {nf0.format(k.objekt.kaufpreis)} €
                        </span>
                      </span>
                    ) : null}
                    {k.finanzierung.darlehensbetrag ? (
                      <span>
                        Darlehen{" "}
                        <span className="text-foreground font-medium">
                          {nf0.format(k.finanzierung.darlehensbetrag)} €
                        </span>
                      </span>
                    ) : null}
                    {k.objekt.ort ? <span>{k.objekt.ort}</span> : null}
                  </div>
                  {kRequests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {kRequests.map((r) => (
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
                      href={`/konzepte/${k.id}`}
                      className="text-xs text-[#6c5ce7] hover:underline"
                    >
                      Konzept öffnen
                    </Link>
                    <Link
                      href={`/banken?konzept=${k.id}`}
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
