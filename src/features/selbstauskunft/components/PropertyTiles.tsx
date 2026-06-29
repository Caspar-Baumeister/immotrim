"use client";

import { useTranslations } from "next-intl";
import {
  Building2,
  FileText,
  Plus,
  Save,
  FileCheck2,
  Trash2,
  PencilLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaStatus } from "@/lib/selbstauskunft/completeness";
import type { SaLevel } from "@/lib/selbstauskunft/requirements";
import type { FlowProperty } from "../types";

const STATUS_STYLES: Record<SaStatus, { dot: string; text: string; ring: string }> = {
  green: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-500/30" },
  red: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", ring: "border-red-500/30" },
  orange: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", ring: "border-orange-500/30" },
  yellow: { dot: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-500", ring: "border-yellow-500/30" },
};

const LEVEL_TEXT: Record<SaLevel, string> = {
  pflicht: "text-red-600 dark:text-red-400",
  empfohlen: "text-orange-600 dark:text-orange-400",
  optional: "text-yellow-600 dark:text-yellow-500",
};

type Props = {
  properties: FlowProperty[];
  unsorted: number;
  allReady: boolean;
  busy: boolean;
  onAddMore: () => void;
  onSave: () => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onManual: (id: string) => void;
};

export function PropertyTiles({
  properties,
  unsorted,
  allReady,
  busy,
  onAddMore,
  onSave,
  onCreate,
  onDelete,
  onManual,
}: Props) {
  const t = useTranslations("selbstauskunft.flow");

  const statusLabel = (s: SaStatus) =>
    s === "green"
      ? t("statusGreen")
      : s === "red"
        ? t("statusRed")
        : s === "orange"
          ? t("statusOrange")
          : t("statusYellow");

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
          {t("tilesTitle")}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("tilesSubtitle")}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => {
          const s = STATUS_STYLES[p.status];
          return (
            <article
              key={p.id}
              className={cn("rounded-2xl border bg-card p-5 flex flex-col gap-3", s.ring)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    {p.address && (
                      <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    disabled={busy}
                    aria-label={t("deleteProperty")}
                    title={t("deleteProperty")}
                    className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-destructive disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <span className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", s.dot)} />
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {t("docCount", { count: p.docCount })}
                </span>
                <span className={cn("font-medium", s.text)}>{statusLabel(p.status)}</span>
              </div>

              {p.missing.length > 0 ? (
                <div className="space-y-1.5 border-t border-border pt-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("missingTitle")}
                  </p>
                  <ul className="space-y-1">
                    {p.missing.map((m) => (
                      <li key={m.docType} className="flex items-start gap-2 text-xs">
                        <span
                          className={cn(
                            "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                            m.level === "pflicht"
                              ? "bg-red-500"
                              : m.level === "empfohlen"
                                ? "bg-orange-500"
                                : "bg-yellow-500",
                          )}
                        />
                        <span>
                          <span className={cn("font-medium", LEVEL_TEXT[m.level])}>
                            {m.label}
                          </span>{" "}
                          <span className="text-muted-foreground">— {m.hint}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onManual(p.id)}
                    disabled={busy}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    {t("manualFill")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <FileCheck2 className="h-4 w-4" />
                    {t("statusGreen")}
                  </span>
                  <button
                    type="button"
                    onClick={() => onManual(p.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    {t("manualFill")}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {unsorted > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {t("unsortedNote", { count: unsorted })}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAddMore}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-60 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("addMore")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 disabled:opacity-60 transition-colors"
          >
            <Save className="h-4 w-4" />
            {t("saveDocs")}
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60 transition-colors"
          >
            <FileCheck2 className="h-4 w-4" />
            {t("createSa")}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {allReady ? t("createSaHint") : t("proceedHint")}
        </p>
      </div>
    </div>
  );
}
