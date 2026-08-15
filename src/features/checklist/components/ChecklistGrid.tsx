"use client";

import Link from "next/link";
import { Check, Download, FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PropertyDocument } from "@/lib/supabase";
import type { ChecklistDocType, ChecklistLevel } from "@/lib/checklist/requirements";
import { GENERIC_SELBSTAUSKUNFT_ID } from "@/features/banks/registry";
import { useSelbstauskunftDownload } from "@/features/banks/hooks/useSelbstauskunftDownload";

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
  /** "app": Immotrim generates this document — see requirements.ts. */
  source?: "upload" | "app";
  /** Documents classified into this requirement (empty = still missing). */
  docs: PropertyDocument[];
};

type Props = {
  tiles: ChecklistTile[];
  /** Docs not (yet) mapped to a requirement: still-classifying + `sonstiges`. */
  extraDocs: PropertyDocument[];
  /** Ids of documents the AI is currently sorting/renaming. */
  classifyingIds: Set<string>;
  /** State for the app-generated Selbstauskunft tile (source: "app"). */
  selbstauskunft: { ready: boolean; stammdaten: number; haushalt: number };
  /** State for the app-generated Portfoliobericht tile (source: "app"). */
  report: { ready: boolean; onCreate: () => void };
  onDownload: (doc: PropertyDocument) => void;
  onDelete: (doc: PropertyDocument) => void;
};

export function ChecklistGrid({
  tiles,
  extraDocs,
  classifyingIds,
  selbstauskunft,
  report,
  onDownload,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const isApp = tile.source === "app";
          const appReady =
            tile.docType === "portfoliobericht" ? report.ready : selbstauskunft.ready;
          const present = tile.docs.length > 0 || (isApp && appReady);
          return (
            <article
              key={tile.docType}
              className={cn(
                "rounded-2xl border p-4 flex flex-col gap-3 transition-colors",
                present
                  ? "border-border bg-card"
                  : isApp
                    ? "border-[#6c5ce7]/30 bg-[#6c5ce7]/[0.03]"
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
                ) : isApp ? (
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]"
                    title="Erstellt Immotrim automatisch"
                  >
                    <Sparkles className="h-3 w-3" />
                  </span>
                ) : (
                  <span
                    className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", LEVEL_DOT[tile.level])}
                    title={LEVEL_LABEL[tile.level]}
                  />
                )}
              </div>

              {tile.docs.length > 0 && (
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
              )}

              {isApp ? (
                tile.docType === "portfoliobericht" ? (
                  <ReportTileAction report={report} />
                ) : (
                  <SelbstauskunftTileAction selbstauskunft={selbstauskunft} />
                )
              ) : (
                tile.docs.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mt-auto pt-1">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Noch nicht vorhanden</span>
                    <span className={cn("ml-auto text-[10px] uppercase tracking-wide")}>
                      {LEVEL_LABEL[tile.level]}
                    </span>
                  </div>
                )
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

// Footer of the app-generated Selbstauskunft tile: create/download the PDF and,
// while the source sections are incomplete, link to what still needs filling.
function SelbstauskunftTileAction({
  selbstauskunft,
}: {
  selbstauskunft: { ready: boolean; stammdaten: number; haushalt: number };
}) {
  const { busy, error, download } = useSelbstauskunftDownload(
    GENERIC_SELBSTAUSKUNFT_ID,
  );
  const open = [
    { href: "/stammdaten", label: "Stammdaten", value: selbstauskunft.stammdaten },
    { href: "/haushalt", label: "Haushaltsrechnung", value: selbstauskunft.haushalt },
  ].filter((s) => s.value < 100);

  return (
    <div className="flex flex-col gap-2 mt-auto pt-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={download}
        disabled={busy}
        className="w-full gap-1.5"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Selbstauskunft erstellen (PDF)
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <span className="min-w-0">
          {open.length > 0 ? (
            <>
              Noch unvollständig:{" "}
              {open.map((s, i) => (
                <span key={s.href}>
                  {i > 0 && " · "}
                  <Link href={s.href} className="text-[#6c5ce7] hover:underline">
                    {s.label} ({Math.round(s.value)} %)
                  </Link>
                </span>
              ))}
            </>
          ) : (
            "Alle Angaben vollständig."
          )}
        </span>
        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          Automatisch
        </span>
      </div>
    </div>
  );
}

// Footer of the app-generated Portfoliobericht tile: open the report dialog, or
// point to the portfolio while there are no properties to report on.
function ReportTileAction({
  report,
}: {
  report: { ready: boolean; onCreate: () => void };
}) {
  return (
    <div className="flex flex-col gap-2 mt-auto pt-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={report.onCreate}
        disabled={!report.ready}
        className="w-full gap-1.5"
      >
        <FileText className="h-3.5 w-3.5" />
        Bericht erstellen (PDF)
      </Button>
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <span className="min-w-0">
          {report.ready ? (
            "Mit den Grafiken deiner Immobilien — ideal als Anlage für Banken."
          ) : (
            <>
              Noch keine Immobilien —{" "}
              <Link href="/portfolio" className="text-[#6c5ce7] hover:underline">
                lege zuerst dein Portfolio an
              </Link>
              .
            </>
          )}
        </span>
        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          Automatisch
        </span>
      </div>
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
