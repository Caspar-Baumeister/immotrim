"use client";

import { Check, Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PropertyDocument } from "@/lib/supabase";
import type { ChecklistDocType, ChecklistLevel } from "@/lib/checklist/requirements";

const LEVEL_DOT: Record<ChecklistLevel, string> = {
  pflicht: "bg-red-500",
  empfohlen: "bg-orange-500",
  optional: "bg-yellow-500",
};

const LEVEL_LABEL: Record<ChecklistLevel, string> = {
  pflicht: "Pflicht",
  empfohlen: "Empfohlen",
  optional: "Optional",
};

export type ChecklistTile = {
  docType: ChecklistDocType;
  level: ChecklistLevel;
  label: string;
  hint: string;
  /** Documents classified into this requirement (empty = still missing). */
  docs: PropertyDocument[];
};

type Props = {
  tiles: ChecklistTile[];
  /** Docs not (yet) mapped to a requirement: still-classifying + `sonstiges`. */
  extraDocs: PropertyDocument[];
  /** Ids of documents the AI is currently sorting/renaming. */
  classifyingIds: Set<string>;
  onDownload: (doc: PropertyDocument) => void;
  onDelete: (doc: PropertyDocument) => void;
};

export function ChecklistGrid({
  tiles,
  extraDocs,
  classifyingIds,
  onDownload,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const present = tile.docs.length > 0;
          return (
            <article
              key={tile.docType}
              className={cn(
                "rounded-2xl border p-4 flex flex-col gap-3 transition-colors",
                present
                  ? "border-border bg-card"
                  : "border-dashed border-border bg-muted/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {tile.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{tile.hint}</p>
                </div>
                {present ? (
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span
                    className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", LEVEL_DOT[tile.level])}
                    title={LEVEL_LABEL[tile.level]}
                  />
                )}
              </div>

              {present ? (
                <div className="flex flex-col divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
                  {tile.docs.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      classifying={classifyingIds.has(doc.id)}
                      onDownload={onDownload}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mt-auto pt-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Noch nicht vorhanden</span>
                  <span className={cn("ml-auto text-[10px] uppercase tracking-wide")}>
                    {LEVEL_LABEL[tile.level]}
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
                onDownload={onDownload}
                onDelete={onDelete}
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
}: {
  doc: PropertyDocument;
  classifying: boolean;
  onDownload: (doc: PropertyDocument) => void;
  onDelete: (doc: PropertyDocument) => void;
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
