"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Landmark, Loader2, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/features/profile/components/SectionHeader";
import { KonzeptForm } from "@/features/konzepte/components/KonzeptForm";
import { KonzeptUnterlagen } from "@/features/konzepte/components/KonzeptUnterlagen";
import {
  deleteKonzept,
  getKonzept,
  updateKonzept,
} from "@/features/konzepte/konzept-service";
import type { Konzept, KonzeptDraft } from "@/features/konzepte/types";
import {
  ANFRAGE_STATUS_LABELS,
  listRequestsForConcept,
  type BankRequest,
} from "@/features/anfrage/request-service";
import { getBank } from "@/features/banks/registry";

export default function KonzeptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [konzept, setKonzept] = useState<Konzept | null>(null);
  const [draft, setDraft] = useState<KonzeptDraft | null>(null);
  const [requests, setRequests] = useState<BankRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getKonzept(id), listRequestsForConcept(id)]).then(([k, rs]) => {
      setKonzept(k);
      if (k) {
        setDraft({
          title: k.title,
          conceptType: k.conceptType,
          description: k.description,
          wishlistPropertyId: k.wishlistPropertyId,
          objekt: k.objekt,
          finanzierung: k.finanzierung,
        });
      }
      setRequests(rs);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await updateKonzept(id, draft);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Konzept wirklich löschen? Auch die hochgeladenen Objektunterlagen dieses Konzepts werden gelöscht.",
      )
    )
      return;
    await deleteKonzept(id);
    router.push("/konzepte");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Konzept" />
        <div className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
        </div>
      </div>
    );
  }

  if (!konzept || !draft) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Konzept" />
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">
            Konzept nicht gefunden.{" "}
            <Link href="/konzepte" className="text-[#6c5ce7] hover:underline">
              Zur Übersicht
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const activeRequests = requests.filter((r) => r.status !== "entwurf");

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={konzept.title} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto max-w-5xl w-full">
        <SectionHeader
          title={konzept.title}
          description="Konzept, Objektunterlagen und der Stand deiner Bankanfragen — alles zu diesem Vorhaben an einem Ort."
        />

        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/banken?konzept=${konzept.id}`}>
            <Button className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5">
              <Landmark className="h-4 w-4" /> Banken für dieses Konzept
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="gap-1.5 text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" /> Löschen
          </Button>
        </div>

        {activeRequests.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Anfragen</h2>
            <div className="flex flex-wrap gap-2">
              {activeRequests.map((r) => (
                <Link
                  key={r.bankId}
                  href={`/konzepte/${konzept.id}/anfrage/${r.bankId}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:border-[#6c5ce7]/40"
                >
                  {getBank(r.bankId)?.shortName ?? r.bankId} ·{" "}
                  <span className="text-muted-foreground">
                    {ANFRAGE_STATUS_LABELS[r.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <KonzeptForm
          draft={draft}
          onChange={(next) => {
            setDraft(next);
            setSaved(false);
          }}
          onSave={handleSave}
          saving={saving}
          saved={saved}
        />

        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Objektunterlagen</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unterlagen zum Kaufobjekt dieses Konzepts. Deine persönlichen Unterlagen
              verwaltest du weiterhin in der{" "}
              <Link href="/checklist" className="text-[#6c5ce7] hover:underline">
                Checkliste
              </Link>
              .
            </p>
          </div>
          <KonzeptUnterlagen
            conceptId={konzept.id}
            wishlistPropertyId={konzept.wishlistPropertyId}
          />
        </div>
      </div>
    </div>
  );
}
