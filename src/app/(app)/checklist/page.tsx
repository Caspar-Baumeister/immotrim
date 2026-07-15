"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { SectionHeader } from "@/features/profile/components/SectionHeader";
import { ChecklistGrid, type ChecklistTile } from "@/features/checklist/components/ChecklistGrid";
import {
  classifyDocuments,
  deleteDocument,
  getDownloadUrl,
  listBorrowerDocuments,
  uploadDocument,
} from "@/lib/document-service";
import {
  CHECKLIST_REQUIREMENTS,
  CHECKLIST_REQUIREMENT_BY_TYPE,
  type ChecklistDocType,
} from "@/lib/checklist/requirements";
import { checklistCompletion } from "@/lib/checklist/completeness";
import type { PropertyDocument } from "@/lib/supabase";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 50 * 1024 * 1024;

export default function ChecklistPage() {
  const [docs, setDocs] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [classifyingIds, setClassifyingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setClassifying = (ids: string[], on: boolean) =>
    setClassifyingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  // Send docs to the AI to classify + rename, then merge the result into state.
  const runClassify = useCallback(async (targets: PropertyDocument[]) => {
    if (targets.length === 0) return;
    setClassifying(targets.map((d) => d.id), true);
    try {
      const results = await classifyDocuments(
        targets.map((d) => ({ id: d.id, path: d.file_path, name: d.file_name })),
      );
      const byId = new Map(results.map((r) => [r.id, r]));
      setDocs((prev) =>
        prev.map((d) => {
          const r = byId.get(d.id);
          return r ? { ...d, doc_type: r.docType, file_name: r.fileName } : d;
        }),
      );
    } catch (e) {
      const err = e as { status?: number; limit?: number };
      if (err.status === 429) {
        setError(
          `Du hast dein monatliches Limit von ${err.limit ?? 500} KI-Auswertungen erreicht. Es wird zum Monatsanfang zurückgesetzt.`,
        );
      } else if (err.status === 503) {
        setError("Der Einsortier-Dienst ist gerade ausgelastet. Bitte versuche es gleich noch einmal.");
      } else {
        setError("Dokumente konnten nicht einsortiert werden.");
      }
    } finally {
      setClassifying(targets.map((d) => d.id), false);
    }
  }, []);

  // Load all borrower docs, then classify any that aren't sorted yet (e.g.
  // uploaded in Stammdaten/Haushalt) so the checklist reflects every section.
  useEffect(() => {
    let cancelled = false;
    listBorrowerDocuments().then((rows) => {
      if (cancelled) return;
      setDocs(rows);
      setLoading(false);
      const unsorted = rows.filter((d) => !d.doc_type);
      if (unsorted.length > 0) void runClassify(unsorted);
    });
    return () => {
      cancelled = true;
    };
  }, [runClassify]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const fresh: PropertyDocument[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!ACCEPTED.includes(file.type)) {
          setError(`${file.name}: nur PDF oder Bilder (PNG/JPG/WebP).`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError(`${file.name}: zu groß (max. 50 MB).`);
          continue;
        }
        const row = await uploadDocument(file, { category: "checklist" });
        fresh.push(row);
        setDocs((prev) => [row, ...prev]);
      }
    } catch {
      setError("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
    if (fresh.length > 0) void runClassify(fresh);
  };

  const handleDelete = async (doc: PropertyDocument) => {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    try {
      await deleteDocument(doc);
    } catch {
      setError("Löschen fehlgeschlagen.");
      listBorrowerDocuments().then(setDocs);
    }
  };

  const handleDownload = async (doc: PropertyDocument) => {
    const url = await getDownloadUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener");
  };

  // Group docs into requirement tiles; anything unsorted/`sonstiges` is "extra".
  const { tiles, extraDocs, completion } = useMemo(() => {
    const tiles: ChecklistTile[] = CHECKLIST_REQUIREMENTS.map((r) => ({
      docType: r.docType,
      level: r.level,
      label: r.label,
      hint: r.hint,
      docs: docs.filter((d) => d.doc_type === r.docType),
    }));
    const extraDocs = docs.filter(
      (d) => !d.doc_type || !CHECKLIST_REQUIREMENT_BY_TYPE[d.doc_type as ChecklistDocType],
    );
    const presentTypes = new Set<ChecklistDocType>(
      docs
        .map((d) => d.doc_type as ChecklistDocType | null)
        .filter((t): t is ChecklistDocType => !!t),
    );
    return { tiles, extraDocs, completion: checklistCompletion(presentTypes) };
  }, [docs]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Unterlagen Checkliste" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto max-w-5xl w-full">
        <SectionHeader
          title="Unterlagen Checkliste"
          description="Alle persönlichen Unterlagen, die deine Bank für die Finanzierung braucht — an einem Ort."
          completion={completion}
          help={
            <>
              Lade deine Nachweise hoch — <strong>SCHUFA, Gehaltsabrechnung, Kontoauszüge,
              Steuerbescheid, Ausweis</strong> und mehr. Die KI erkennt automatisch, worum es sich
              handelt, sortiert jedes Dokument in die passende Kachel und benennt es sinnvoll um.
              Auch Dokumente, die du unter Stammdaten oder Haushaltsrechnung hochgeladen hast,
              erscheinen hier. Offene Kacheln zeigen, was noch fehlt.
            </>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-6 text-center cursor-pointer hover:border-[#6c5ce7]/40 hover:bg-[#6c5ce7]/[0.03] transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#6c5ce7]" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">Dokumente hochladen</span>
              <span className="text-[11px] text-muted-foreground">
                Die KI sortiert sie automatisch ein — PDF oder Bild, max. 50 MB.
              </span>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <ChecklistGrid
              tiles={tiles}
              extraDocs={extraDocs}
              classifyingIds={classifyingIds}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
