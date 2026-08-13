"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { BankCard } from "@/features/banks/components/BankCard";
import { BANKS, type Bank } from "@/features/banks/registry";
import { bankCompletion } from "@/features/banks/requirements";
import { getAllProperties } from "@/lib/property-service";
import { getProfile } from "@/lib/profile-service";
import {
  listBorrowerDocuments,
  listConceptDocuments,
} from "@/lib/document-service";
import { getAllKonzepte } from "@/features/konzepte/konzept-service";
import { listConceptObjects } from "@/features/konzepte/objekt-service";
import { objektLabel, type ConceptObject } from "@/features/konzepte/types";
import {
  listRequestsForConcept,
  upsertRequestStatus,
  type AnfrageStatus,
  type BankRequest,
} from "@/features/anfrage/request-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { estimateFinancing, bankFinancingScore } from "@/features/financing/calculations";
import { CHECKLIST_DOC_TYPES, type ChecklistDocType } from "@/lib/checklist/requirements";
import { SA_DOC_TYPES, type SaDocType } from "@/lib/selbstauskunft/requirements";
import type { Property, PropertyDocument } from "@/lib/supabase";
import type { Profile } from "@/features/profile/types";
import type { Konzept } from "@/features/konzepte/types";

// useSearchParams needs a Suspense boundary — the actual page lives below.
export default function BankenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
        </div>
      }
    >
      <BankenContent />
    </Suspense>
  );
}

function BankenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [konzepte, setKonzepte] = useState<Konzept[]>([]);
  const [borrowerDocs, setBorrowerDocs] = useState<PropertyDocument[]>([]);
  // Loaded per selected concept; keyed by id so a stale load never leaks into
  // another concept's view (and no state reset is needed on switch).
  const [conceptData, setConceptData] = useState<{
    id: string;
    objects: ConceptObject[];
    requests: BankRequest[];
  } | null>(null);
  // Concept docs depend on (concept, selected object) — keyed the same way.
  const [conceptDocsData, setConceptDocsData] = useState<{
    key: string;
    docs: PropertyDocument[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllProperties(),
      getProfile(),
      getAllKonzepte(),
      listBorrowerDocuments(),
    ]).then(([ps, pr, ks, docs]) => {
      setProperties(ps);
      setProfile(pr);
      setKonzepte(ks);
      setBorrowerDocs(docs);
      setLoading(false);
    });
  }, []);

  // Selected concept: ?konzept= if valid, else the newest concept.
  const requestedId = searchParams.get("konzept");
  const selected =
    konzepte.find((k) => k.id === requestedId) ?? konzepte[0] ?? null;

  const selectKonzept = (id: string) => {
    router.replace(id ? `/banken?konzept=${id}` : "/banken");
  };

  // Objects + outreach statuses follow the selected concept.
  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    Promise.all([
      listConceptObjects(selectedId),
      listRequestsForConcept(selectedId),
    ]).then(([os, rs]) => {
      if (cancelled) return;
      setConceptData({ id: selectedId, objects: os, requests: rs });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const objects = useMemo(
    () => (conceptData && conceptData.id === selectedId ? conceptData.objects : []),
    [conceptData, selectedId],
  );
  const requests = useMemo(
    () => (conceptData && conceptData.id === selectedId ? conceptData.requests : []),
    [conceptData, selectedId],
  );

  // Selected object: ?objekt= if valid, else the concept's first object.
  const requestedObjektId = searchParams.get("objekt");
  const selectedObjectId =
    objects.find((o) => o.id === requestedObjektId)?.id ?? objects[0]?.id ?? null;

  const selectObjekt = (objektId: string) => {
    if (!selectedId) return;
    router.replace(
      `/banken?konzept=${selectedId}${objektId ? `&objekt=${objektId}` : ""}`,
    );
  };

  // Concept docs = shared docs + the selected object's exposé (completion scoring).
  const docsKey = selectedId ? `${selectedId}/${selectedObjectId ?? ""}` : null;
  const objectsReady = conceptData?.id === selectedId;
  useEffect(() => {
    if (!selectedId || !docsKey || !objectsReady) return;
    let cancelled = false;
    listConceptDocuments(selectedId, selectedObjectId).then((docs) => {
      if (cancelled) return;
      setConceptDocsData({ key: docsKey, docs });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, selectedObjectId, docsKey, objectsReady]);

  const conceptDocs = useMemo(
    () => (conceptDocsData?.key === docsKey ? conceptDocsData.docs : []),
    [conceptDocsData, docsKey],
  );

  const kpis = calculatePortfolioKpis(
    properties.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      inputs: p.inputs,
    })),
  );
  const haushalt = profile?.haushalt ?? {};
  const est = estimateFinancing(haushalt, kpis.monthlyCashFlowBeforeTax);

  const presentBorrower = useMemo(
    () =>
      new Set<ChecklistDocType>(
        borrowerDocs
          .map((d) => d.doc_type)
          .filter((t): t is ChecklistDocType =>
            (CHECKLIST_DOC_TYPES as readonly string[]).includes(t ?? ""),
          ),
      ),
    [borrowerDocs],
  );
  const presentObject = useMemo(
    () =>
      new Set<SaDocType>(
        conceptDocs
          .map((d) => d.doc_type)
          .filter((t): t is SaDocType =>
            (SA_DOC_TYPES as readonly string[]).includes(t ?? ""),
          ),
      ),
    [conceptDocs],
  );

  const statusByBank = useMemo(
    () => new Map(requests.map((r) => [r.bankId, r.status])),
    [requests],
  );

  const handleStatusChange = useCallback(
    async (bankId: string, status: AnfrageStatus) => {
      if (!selected) return;
      const conceptId = selected.id;
      const objectId = selectedObjectId;
      const patch = (requests: BankRequest[]): BankRequest[] => [
        ...requests.filter((r) => r.bankId !== bankId),
        { conceptId, bankId, objectId, status, sentAt: null, notes: null },
      ];
      setConceptData((prev) =>
        prev && prev.id === conceptId ? { ...prev, requests: patch(prev.requests) } : prev,
      );
      try {
        await upsertRequestStatus(conceptId, bankId, status, {
          sentAt: status === "angefragt" ? new Date().toISOString() : undefined,
          objectId,
        });
      } catch {
        const rs = await listRequestsForConcept(conceptId);
        setConceptData((prev) =>
          prev && prev.id === conceptId ? { ...prev, requests: rs } : prev,
        );
      }
    },
    [selected, selectedObjectId],
  );

  const renderCards = (banks: Bank[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {banks.map((bank) => {
        const completion = bankCompletion(bank.id, presentBorrower, presentObject);
        return (
          <BankCard
            key={bank.id}
            bank={bank}
            completeness={completion.pct}
            score={bankFinancingScore(
              est,
              bank.conditions ?? {},
              haushalt.nettoeinkommen ?? 0,
            )}
            missing={completion.missing.map((m) => m.label)}
            conceptId={selected?.id}
            objectId={selectedObjectId ?? undefined}
            status={statusByBank.get(bank.id)}
            onStatusChange={
              selected ? (s) => handleStatusChange(bank.id, s) : undefined
            }
          />
        );
      })}
    </div>
  );

  const direct = BANKS.filter((b) => b.kind === "bank");
  const vermittler = BANKS.filter((b) => b.kind === "vermittler");

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Banken" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold font-heading text-foreground">
              Banken
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Wähle ein Konzept und sieh pro Bank, welche Unterlagen noch fehlen und
              wie gut deine Finanzierung passt (Schätzung). Mit einem Klick erstellst
              du die fertige Finanzierungsanfrage.
            </p>
          </div>
          {konzepte.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="flex flex-col gap-1.5 w-full sm:w-72">
                <label
                  htmlFor="konzept-select"
                  className="text-xs text-muted-foreground"
                >
                  Konzept
                </label>
                <select
                  id="konzept-select"
                  value={selected?.id ?? ""}
                  onChange={(e) => selectKonzept(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {konzepte.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.title}
                    </option>
                  ))}
                </select>
              </div>
              {objects.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full sm:w-64">
                  <label
                    htmlFor="objekt-select"
                    className="text-xs text-muted-foreground"
                  >
                    Objekt
                  </label>
                  <select
                    id="objekt-select"
                    value={selectedObjectId ?? ""}
                    onChange={(e) => selectObjekt(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {objects.map((o) => (
                      <option key={o.id} value={o.id}>
                        {objektLabel(o)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : (
          <>
            {konzepte.length === 0 && (
              <p className="text-xs text-muted-foreground bg-muted/10 border border-border rounded-lg px-3 py-2 max-w-2xl">
                Du hast noch kein Konzept angelegt.{" "}
                <Link href="/konzepte/new" className="text-[#6c5ce7] hover:underline">
                  Lege zuerst ein Konzept an
                </Link>
                , damit die Anfrage und die Objektunterlagen ein konkretes Vorhaben
                beschreiben.
              </p>
            )}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">Banken</h2>
              {renderCards(direct)}
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Vermittler{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  — eine Anfrage erreicht viele Banken
                </span>
              </h2>
              {renderCards(vermittler)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
