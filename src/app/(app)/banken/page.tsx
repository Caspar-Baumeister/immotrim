"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { BankCard } from "@/features/banks/components/BankCard";
import { BANKS, type Bank } from "@/features/banks/registry";
import { getAllProperties } from "@/lib/property-service";
import { getProfile } from "@/lib/profile-service";
import { listObjekte } from "@/features/objekte/objekt-service";
import { objektLabel, type Objekt } from "@/features/objekte/types";
import {
  listRequestsForObjekt,
  upsertRequestStatus,
  type AnfrageStatus,
  type BankRequest,
} from "@/features/anfrage/request-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { estimateFinancing, bankFinancingScore } from "@/features/financing/calculations";
import type { Property } from "@/lib/supabase";
import type { Profile } from "@/features/profile/types";

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
  const [objekte, setObjekte] = useState<Objekt[]>([]);
  // Loaded per selected object; keyed by id so a stale load never leaks into
  // another object's view (and no state reset is needed on switch).
  const [objektRequests, setObjektRequests] = useState<{
    id: string;
    requests: BankRequest[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllProperties(), getProfile(), listObjekte()]).then(
      ([ps, pr, os]) => {
        setProperties(ps);
        setProfile(pr);
        setObjekte(os);
        setLoading(false);
      },
    );
  }, []);

  // Selected object: ?objekt= if valid, else the newest object.
  const requestedId = searchParams.get("objekt");
  const selected =
    objekte.find((o) => o.id === requestedId) ?? objekte[0] ?? null;

  const selectObjekt = (id: string) => {
    router.replace(id ? `/banken?objekt=${id}` : "/banken");
  };

  // Outreach statuses follow the selected object.
  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    listRequestsForObjekt(selectedId).then((rs) => {
      if (cancelled) return;
      setObjektRequests({ id: selectedId, requests: rs });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const requests = useMemo(
    () =>
      objektRequests && objektRequests.id === selectedId
        ? objektRequests.requests
        : [],
    [objektRequests, selectedId],
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

  const statusByBank = useMemo(
    () => new Map(requests.map((r) => [r.bankId, r.status])),
    [requests],
  );

  const handleStatusChange = useCallback(
    async (bankId: string, status: AnfrageStatus) => {
      if (!selectedId) return;
      const objectId = selectedId;
      const patch = (requests: BankRequest[]): BankRequest[] => [
        ...requests.filter((r) => r.bankId !== bankId),
        { objectId, bankId, status, sentAt: null, notes: null },
      ];
      setObjektRequests((prev) =>
        prev && prev.id === objectId ? { ...prev, requests: patch(prev.requests) } : prev,
      );
      try {
        await upsertRequestStatus(objectId, bankId, status, {
          sentAt: status === "angefragt" ? new Date().toISOString() : undefined,
        });
      } catch {
        const rs = await listRequestsForObjekt(objectId);
        setObjektRequests((prev) =>
          prev && prev.id === objectId ? { ...prev, requests: rs } : prev,
        );
      }
    },
    [selectedId],
  );

  const renderCards = (banks: Bank[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {banks.map((bank) => (
        <BankCard
          key={bank.id}
          bank={bank}
          score={bankFinancingScore(
            est,
            bank.conditions ?? {},
            haushalt.nettoeinkommen ?? 0,
          )}
          objectId={selectedId}
          status={statusByBank.get(bank.id)}
          onStatusChange={
            selectedId ? (s) => handleStatusChange(bank.id, s) : undefined
          }
        />
      ))}
    </div>
  );

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
              Wähle ein Objekt und sieh pro Bank, wie gut deine Finanzierung passt
              (Schätzung). Mit einem Klick erstellst du die fertige
              Finanzierungsanfrage.
            </p>
          </div>
          {objekte.length > 0 && (
            <div className="flex flex-col gap-1.5 w-full sm:w-72">
              <label
                htmlFor="objekt-select"
                className="text-xs text-muted-foreground"
              >
                Objekt
              </label>
              <select
                id="objekt-select"
                value={selected?.id ?? ""}
                onChange={(e) => selectObjekt(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {objekte.map((o) => (
                  <option key={o.id} value={o.id}>
                    {objektLabel(o)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : (
          <>
            {objekte.length === 0 && (
              <p className="text-xs text-muted-foreground bg-muted/10 border border-border rounded-lg px-3 py-2 max-w-2xl">
                Du hast noch kein Objekt angelegt.{" "}
                <Link href="/objekte" className="text-[#6c5ce7] hover:underline">
                  Lege zuerst ein Objekt an
                </Link>
                , damit die Anfrage und die Objektunterlagen ein konkretes Vorhaben
                beschreiben.
              </p>
            )}
            {renderCards(BANKS)}
          </>
        )}
      </div>
    </div>
  );
}
