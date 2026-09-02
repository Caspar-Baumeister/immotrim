"use client";

// One object: exposé upload + AI extraction on top, the editable icon form and
// the Finanzierungsbedarf below, then Objektunterlagen and the status of its
// bank requests. Draft state lives here; Speichern persists data + details +
// finanzierung via updateObjekt.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Landmark,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { ObjektForm } from "@/features/objekte/components/ObjektForm";
import { ObjektFinanzierungCard } from "@/features/objekte/components/ObjektFinanzierungCard";
import { ObjektDocumentUpload } from "@/features/objekte/components/ObjektDocumentUpload";
import { ObjektUnterlagen } from "@/features/objekte/components/ObjektUnterlagen";
import {
  deleteObjekt,
  getObjekt,
  updateObjekt,
} from "@/features/objekte/objekt-service";
import {
  objektLabel,
  type Objekt,
  type ObjektDaten,
  type ObjektDetails,
  type ObjektFinanzierung,
} from "@/features/objekte/types";
import {
  ANFRAGE_STATUS_LABELS,
  listRequestsForObjekt,
  type BankRequest,
} from "@/features/anfrage/request-service";
import { getBank } from "@/features/banks/registry";

export default function ObjektDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [objekt, setObjekt] = useState<Objekt | null>(null);
  const [data, setData] = useState<ObjektDaten>({});
  const [details, setDetails] = useState<ObjektDetails>({});
  const [finanzierung, setFinanzierung] = useState<ObjektFinanzierung>({});
  const [requests, setRequests] = useState<BankRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getObjekt(id), listRequestsForObjekt(id)]).then(([o, rs]) => {
      setObjekt(o);
      if (o) {
        setData(o.data);
        setDetails(o.details);
        setFinanzierung(o.finanzierung);
      }
      setRequests(rs);
      setLoading(false);
    });
  }, [id]);

  const patchData = (patch: Partial<ObjektDaten>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };
  const patchDetails = (patch: Partial<ObjektDetails>) => {
    setDetails((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };
  const patchFinanzierung = (patch: Partial<ObjektFinanzierung>) => {
    setFinanzierung((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateObjekt(id, { data, details, finanzierung });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Objekt wirklich löschen? Auch die hochgeladenen Unterlagen dieses Objekts werden gelöscht.",
      )
    )
      return;
    await deleteObjekt(id);
    router.push("/objekte");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Objekt" />
        <div className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
        </div>
      </div>
    );
  }

  if (!objekt) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Objekt" />
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">
            Objekt nicht gefunden.{" "}
            <Link href="/objekte" className="text-[#6c5ce7] hover:underline">
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
      <TopBar title={objektLabel(objekt)} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto max-w-5xl w-full">
        <div>
          <Link
            href="/objekte"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Zurück zu allen Objekten
          </Link>
          <h1 className="text-lg font-semibold font-heading text-foreground mt-2">
            {objektLabel({ ...objekt, data })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Lade das Exposé hoch — die KI liest die Eckdaten für die Bank aus. Danach
            kannst du jedes Feld prüfen und anpassen.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/banken?objekt=${objekt.id}`}>
            <Button className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5">
              <Landmark className="h-4 w-4" /> Banken für dieses Objekt
            </Button>
          </Link>
        </div>

        {activeRequests.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Anfragen</h2>
            <div className="flex flex-wrap gap-2">
              {activeRequests.map((r) => (
                <Link
                  key={r.bankId}
                  href={`/objekte/${objekt.id}/anfrage/${r.bankId}`}
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

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#6c5ce7]" />
            <h2 className="text-sm font-semibold text-foreground">
              Exposé hochladen &amp; auslesen
            </h2>
          </div>
          <ObjektDocumentUpload
            objectId={id}
            snapshot={{ data, details }}
            onPatchData={patchData}
            onPatchDetails={patchDetails}
          />
        </div>

        <ObjektForm
          data={data}
          details={details}
          onDataChange={patchData}
          onDetailsChange={patchDetails}
        />

        <ObjektFinanzierungCard
          finanzierung={finanzierung}
          onChange={patchFinanzierung}
        />

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
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
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="ml-auto gap-1.5 text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" /> Objekt löschen
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Objektunterlagen</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unterlagen zu diesem Objekt. Deine persönlichen Unterlagen verwaltest du
              weiterhin in der{" "}
              <Link href="/checklist" className="text-[#6c5ce7] hover:underline">
                Checkliste
              </Link>
              .
            </p>
          </div>
          <ObjektUnterlagen objectId={objekt.id} />
        </div>
      </div>
    </div>
  );
}
