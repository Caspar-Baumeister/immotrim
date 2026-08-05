"use client";

// Objektunterlagen of one concept: drop-zone upload, AI classification into the
// Selbstauskunft doc types (via /api/konzepte/classify) and requirement tiles —
// the same interaction as the Unterlagen-Checkliste, but with the OBJECT
// vocabulary and a manual doc-type select as correction fallback.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteDocument,
  getDownloadUrl,
  listConceptDocuments,
  setDocumentType,
  uploadDocument,
} from "@/lib/document-service";
import {
  DOC_TYPE_LABELS,
  REQUIREMENTS,
  REQUIREMENT_BY_TYPE,
  SA_DOC_TYPES,
  type SaDocType,
  type SaLevel,
} from "@/lib/selbstauskunft/requirements";
import type { PropertyDocument } from "@/lib/supabase";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 50 * 1024 * 1024;

const LEVEL_DOT: Record<SaLevel, string> = {
  pflicht: "bg-red-500",
  empfohlen: "bg-orange-500",
  optional: "bg-yellow-500",
};

const LEVEL_LABEL: Record<SaLevel, string> = {
  pflicht: "Pflicht",
  empfohlen: "Empfohlen",
  optional: "Optional",
};

async function classifyKonzeptDocuments(
  docs: { id: string; path: string; name: string }[],
): Promise<{ id: string; docType: string; fileName: string }[]> {
  const res = await fetch("/api/konzepte/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docs }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; limit?: number } | null;
    const err = new Error(body?.error ?? "classify_failed") as Error & {
      status?: number;
      limit?: number;
    };
    err.status = res.status;
    err.limit = body?.limit;
    throw err;
  }
  const data = (await res.json()) as {
    results?: { id: string; docType: string; fileName: string }[];
  };
  return data.results ?? [];
}

export function KonzeptUnterlagen({
  conceptId,
  wishlistPropertyId,
}: {
  conceptId: string;
  wishlistPropertyId?: string | null;
}) {
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

  const runClassify = useCallback(async (targets: PropertyDocument[]) => {
    if (targets.length === 0) return;
    setClassifying(targets.map((d) => d.id), true);
    try {
      const results = await classifyKonzeptDocuments(
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
        setError("Dokumente konnten nicht einsortiert werden — ordne sie unten manuell zu.");
      }
    } finally {
      setClassifying(targets.map((d) => d.id), false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listConceptDocuments(conceptId, wishlistPropertyId).then((rows) => {
      if (cancelled) return;
      setDocs(rows);
      setLoading(false);
      const unsorted = rows.filter((d) => !d.doc_type);
      if (unsorted.length > 0) void runClassify(unsorted);
    });
    return () => {
      cancelled = true;
    };
  }, [conceptId, wishlistPropertyId, runClassify]);

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
        const row = await uploadDocument(file, { conceptId });
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
      listConceptDocuments(conceptId, wishlistPropertyId).then(setDocs);
    }
  };

  const handleDownload = async (doc: PropertyDocument) => {
    const url = await getDownloadUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener");
  };

  const handleRetype = async (doc: PropertyDocument, docType: string) => {
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, doc_type: docType } : d)));
    try {
      await setDocumentType(doc.id, docType);
    } catch {
      setError("Zuordnung konnte nicht gespeichert werden.");
    }
  };

  const { tiles, extraDocs } = useMemo(() => {
    const tiles = REQUIREMENTS.map((r) => ({
      requirement: r,
      docs: docs.filter((d) => d.doc_type === r.docType),
    }));
    const extraDocs = docs.filter(
      (d) => !d.doc_type || !REQUIREMENT_BY_TYPE[d.doc_type as SaDocType],
    );
    return { tiles, extraDocs };
  }, [docs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[#6c5ce7]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
        <span className="text-sm text-foreground">Objektunterlagen hochladen</span>
        <span className="text-[11px] text-muted-foreground">
          Kaufvertrag, Exposé, Teilungserklärung … — die KI sortiert sie ein. PDF oder Bild, max. 50 MB.
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ requirement: r, docs: tileDocs }) => {
          const present = tileDocs.length > 0;
          return (
            <article
              key={r.docType}
              className={cn(
                "rounded-2xl border p-4 flex flex-col gap-3 transition-colors",
                present ? "border-border bg-card" : "border-dashed border-border bg-muted/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{r.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.hint}</p>
                </div>
                {present ? (
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span
                    className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", LEVEL_DOT[r.level])}
                    title={LEVEL_LABEL[r.level]}
                  />
                )}
              </div>

              {present ? (
                <div className="flex flex-col divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
                  {tileDocs.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      classifying={classifyingIds.has(doc.id)}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onRetype={handleRetype}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mt-auto pt-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Noch nicht vorhanden</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide">
                    {LEVEL_LABEL[r.level]}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {extraDocs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-sm text-foreground">Weitere Dokumente</h3>
          <div className="flex flex-col divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
            {extraDocs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                classifying={classifyingIds.has(doc.id)}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRetype={handleRetype}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  classifying,
  onDownload,
  onDelete,
  onRetype,
}: {
  doc: PropertyDocument;
  classifying: boolean;
  onDownload: (doc: PropertyDocument) => void;
  onDelete: (doc: PropertyDocument) => void;
  onRetype: (doc: PropertyDocument, docType: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2">
      {classifying ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6c5ce7]" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="text-xs text-foreground truncate flex-1">
        {classifying ? "Wird einsortiert…" : doc.file_name}
      </span>
      <select
        value={doc.doc_type ?? "sonstiges"}
        onChange={(e) => onRetype(doc, e.target.value)}
        aria-label="Dokumenttyp"
        className="h-7 max-w-[130px] rounded-md border border-input bg-transparent px-1.5 text-[11px] text-muted-foreground outline-none"
      >
        {SA_DOC_TYPES.map((t) => (
          <option key={t} value={t}>
            {DOC_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onDownload(doc)}
        aria-label="Herunterladen"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(doc)}
        aria-label="Löschen"
        className="text-muted-foreground hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
