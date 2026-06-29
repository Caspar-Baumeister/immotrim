"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Loader2,
  Trash2,
  UploadCloud,
  FileText,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
} from "@/lib/document-service";
import type { Property, PropertyDocument } from "@/lib/supabase";
import { ensureAnonSession, getInboxDraftId } from "@/lib/selbstauskunft/anon";
import {
  evaluateCompleteness,
  buildHint,
  presentFromMeta,
} from "@/lib/selbstauskunft/completeness";
import type { FlowProperty } from "../types";
import { PropertyTiles } from "./PropertyTiles";
import { ConversionForm } from "./ConversionForm";
import { ManualFillModal } from "./ManualFillModal";

type Phase = "loading" | "upload" | "sorting" | "tiles" | "error";

// Sensible report defaults for the funnel; the API ranks properties when the
// selection is empty.
const REPORT_CONFIG = {
  includeTitleImage: false,
  includePropertyImages: false,
  includeCharts: true,
  includeFinancing: true,
  includeTax: false,
  includeNotes: false,
  selectedPropertyIds: [] as string[],
};

function toFlowProperty(p: Property): FlowProperty {
  const meta = p.inputs?.selbstauskunft;
  const present = presentFromMeta(meta);
  const ev = evaluateCompleteness(present);
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    status: ev.status,
    reportReady: ev.reportReady,
    missing: ev.missing,
    hint: buildHint(ev),
    docCount: Object.keys(meta?.docTypes ?? {}).length,
    docTypes: present,
  };
}

export function SelbstauskunftFlow({ locale }: { locale: string }) {
  const t = useTranslations("selbstauskunft.flow");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [inbox, setInbox] = useState<PropertyDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [manualFor, setManualFor] = useState<Property | null>(null);
  const [unsorted, setUnsorted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { mode: "save" | "create" }>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const draftRef = useRef<string>("");

  const tiles = useMemo(() => properties.map(toFlowProperty), [properties]);

  const loadProperties = useCallback(async (): Promise<Property[]> => {
    const sb = getSupabaseBrowserClient();
    const { data } = await sb.from("properties").select("*");
    const rows = (data ?? []) as unknown as Property[];
    return rows.filter((p) => p.inputs?.selbstauskunft);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { isAnonymous } = await ensureAnonSession();
        if (cancelled) return;
        setIsAnonymous(isAnonymous);
        draftRef.current = getInboxDraftId();
        const [inboxDocs, props] = await Promise.all([
          listDocuments({ draftId: draftRef.current }),
          loadProperties(),
        ]);
        if (cancelled) return;
        if (props.length > 0) {
          setProperties(props);
          setPhase("tiles");
        } else {
          setInbox(inboxDocs);
          setPhase("upload");
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProperties]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of list) {
        await uploadDocument(f, { draftId: draftRef.current });
      }
      setInbox(await listDocuments({ draftId: draftRef.current }));
    } catch {
      setError(t("sortFailed"));
    } finally {
      setUploading(false);
    }
  }, [t]);

  const handleRemove = useCallback(async (doc: PropertyDocument) => {
    await deleteDocument(doc);
    setInbox(await listDocuments({ draftId: draftRef.current }));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (inbox.length === 0) {
      setError(t("needFiles"));
      return;
    }
    setPhase("sorting");
    setError(null);
    try {
      const res = await fetch("/api/selbstauskunft/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draftRef.current }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error === "busy"
            ? t("busy")
            : data?.error === "limit"
              ? t("limit")
              : t("sortFailed"),
        );
        setInbox(await listDocuments({ draftId: draftRef.current }));
        setPhase("upload");
        return;
      }
      const data = await res.json();
      const all = await loadProperties();
      setProperties(all);
      setUnsorted(data.unsorted ?? 0);
      setInbox(await listDocuments({ draftId: draftRef.current }));
      setPhase("tiles");
    } catch {
      setError(t("sortFailed"));
      setPhase("upload");
    }
  }, [inbox.length, loadProperties, t]);

  const allReady = tiles.length > 0 && tiles.every((p) => p.reportReady);

  const handleSave = useCallback(() => {
    if (isAnonymous) setModal({ mode: "save" });
    else router.push(`/${locale}/portfolio`);
  }, [isAnonymous, locale, router]);

  const callReport = useCallback(async () => {
    setReportBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, config: REPORT_CONFIG }),
      });
      if (res.status === 402) {
        router.push(`/${locale}/pricing`);
        return;
      }
      if (!res.ok) {
        setError(t("reportFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Selbstauskunft.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("reportFailed"));
    } finally {
      setReportBusy(false);
    }
  }, [locale, router, t]);

  const handleCreate = useCallback(() => {
    // Allow finishing with missing data, but confirm first.
    if (!allReady && !window.confirm(t("createAnywayConfirm"))) return;
    if (isAnonymous) setModal({ mode: "create" });
    else void callReport();
  }, [allReady, isAnonymous, callReport, t]);

  const handleManual = useCallback(
    (id: string) => {
      const p = properties.find((x) => x.id === id);
      if (p) setManualFor(p);
    },
    [properties],
  );

  const handleManualSaved = useCallback((updated: Property) => {
    setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setManualFor(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t("deleteConfirm"))) return;
      const sb = getSupabaseBrowserClient();
      // Deleting the property cascades its document rows (FK on delete cascade).
      await sb.from("properties").delete().eq("id", id);
      const all = await loadProperties();
      setProperties(all);
      if (all.length === 0) setPhase("upload");
    },
    [loadProperties, t],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
        <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
        <p className="font-medium">{t("startError")}</p>
        <p className="text-sm text-muted-foreground">{t("startErrorHint")}</p>
      </div>
    );
  }

  if (phase === "sorting") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="font-heading text-xl font-semibold">{t("sortingTitle")}</p>
        <p className="max-w-md text-sm text-muted-foreground">{t("sortingSubtitle")}</p>
      </div>
    );
  }

  if (phase === "tiles") {
    return (
      <>
        <PropertyTiles
          properties={tiles}
          unsorted={unsorted}
          allReady={allReady}
          busy={reportBusy}
          onAddMore={() => setPhase("upload")}
          onSave={handleSave}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onManual={handleManual}
        />
        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
        {modal && (
          <ConversionForm
            locale={locale}
            mode={modal.mode}
            onCancel={() => setModal(null)}
          />
        )}
        {manualFor && (
          <ManualFillModal
            property={manualFor}
            onClose={() => setManualFor(null)}
            onSaved={handleManualSaved}
          />
        )}
      </>
    );
  }

  // phase === "upload"
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center space-y-3">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
          {t("uploadTitle")}
        </h1>
        <p className="text-muted-foreground">{t("uploadSubtitle")}</p>
      </div>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-6 py-12 text-center transition-colors hover:border-amber-500/50"
      >
        <UploadCloud className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          {t("dropHint")}{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {t("browse")}
          </span>
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {uploading && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("uploading")}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("inboxTitle")}</p>
        {inbox.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("inboxEmpty")}</p>
        ) : (
          <ul className="space-y-1.5">
            {inbox.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.file_name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(doc)}
                  aria-label={t("remove")}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={uploading || inbox.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-6 py-3 text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("analyze")}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-muted-foreground">{t("analyzeHint")}</p>
      </div>
    </div>
  );
}
