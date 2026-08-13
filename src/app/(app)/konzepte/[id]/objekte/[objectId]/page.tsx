"use client";

// One candidate object of a concept: exposé upload + AI extraction on top,
// the editable icon form below. Draft state lives here; Speichern persists
// data + details via updateConceptObject.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { ObjektForm } from "@/features/konzepte/components/ObjektForm";
import { ObjektDocumentUpload } from "@/features/konzepte/components/ObjektDocumentUpload";
import {
  deleteConceptObject,
  getConceptObject,
  updateConceptObject,
} from "@/features/konzepte/objekt-service";
import {
  objektLabel,
  type ConceptObject,
  type KonzeptObjekt,
  type KonzeptObjektDetails,
} from "@/features/konzepte/types";

export default function KonzeptObjektPage() {
  const { id, objectId } = useParams<{ id: string; objectId: string }>();
  const router = useRouter();
  const [objekt, setObjekt] = useState<ConceptObject | null>(null);
  const [data, setData] = useState<KonzeptObjekt>({});
  const [details, setDetails] = useState<KonzeptObjektDetails>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getConceptObject(objectId).then((o) => {
      setObjekt(o);
      if (o) {
        setData(o.data);
        setDetails(o.details);
      }
      setLoading(false);
    });
  }, [objectId]);

  const patchData = (patch: Partial<KonzeptObjekt>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };
  const patchDetails = (patch: Partial<KonzeptObjektDetails>) => {
    setDetails((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConceptObject(objectId, { data, details });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Objekt wirklich löschen? Auch die hochgeladenen Exposé-Dokumente dieses Objekts werden gelöscht.",
      )
    )
      return;
    await deleteConceptObject(objectId);
    router.push(`/konzepte/${id}`);
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
            <Link href={`/konzepte/${id}`} className="text-[#6c5ce7] hover:underline">
              Zum Konzept
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={objektLabel(objekt)} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto max-w-5xl w-full">
        <div>
          <Link
            href={`/konzepte/${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Zurück zum Konzept
          </Link>
          <h1 className="text-lg font-semibold font-heading text-foreground mt-2">
            {objektLabel({ ...objekt, data })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Lade das Exposé hoch — die KI liest die Eckdaten für die Bank aus. Danach
            kannst du jedes Feld prüfen und anpassen.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#6c5ce7]" />
            <h2 className="text-sm font-semibold text-foreground">
              Exposé hochladen &amp; auslesen
            </h2>
          </div>
          <ObjektDocumentUpload
            conceptId={id}
            objectId={objectId}
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
      </div>
    </div>
  );
}
