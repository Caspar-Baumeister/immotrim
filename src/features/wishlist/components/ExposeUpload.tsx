"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "@/lib/document-service";
import type { PropertyDocument } from "@/lib/supabase";
import { ExtractionReviewPanel } from "@/features/extraction/ExtractionReviewPanel";
import type {
  ExtractedWishlistFields,
  WishlistFieldKey,
  WishlistExtractResponse,
  WishlistPatch,
  WishlistSnapshot,
} from "../extraction-types";
import {
  FIELD_ORDER,
  buildPatch,
  currentValueFor,
  formatFieldValue,
} from "../extraction-apply";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 50 * 1024 * 1024;

type Props = {
  draftId: string;
  current: WishlistSnapshot;
  onApply: (patch: WishlistPatch) => void;
};

export function ExposeUpload({ draftId, current, onApply }: Props) {
  const t = useTranslations("documents");
  const tExpose = useTranslations("wishlist.expose");
  const [docs, setDocs] = useState<PropertyDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedWishlistFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listDocuments({ draftId }).then(setDocs);
  }, [draftId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!ACCEPTED.includes(file.type)) {
          setError(t("typeError", { name: file.name }));
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError(t("sizeError", { name: file.name }));
          continue;
        }
        const row = await uploadDocument(file, { draftId });
        setDocs((prev) => [row, ...prev]);
      }
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: PropertyDocument) => {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    try {
      await deleteDocument(doc);
    } catch {
      setError(t("deleteFailed"));
      listDocuments({ draftId }).then(setDocs);
    }
  };

  const handleExtract = async () => {
    setError(null);
    setExtracting(true);
    setExtracted(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "wishlist",
          docs: docs.map((d) => ({ path: d.file_path, name: d.file_name })),
        }),
      });
      if (!res.ok) {
        setError(res.status === 503 ? t("extractBusy") : t("extractFailed"));
        return;
      }
      const data = (await res.json()) as WishlistExtractResponse;
      setExtracted(data.fields ?? {});
    } catch {
      setError(t("extractFailed"));
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-6 text-center cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-colors"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-sm text-foreground">{tExpose("upload")}</span>
        <span className="text-[11px] text-muted-foreground">{tExpose("uploadHint")}</span>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* File list */}
      {docs.length > 0 && (
        <div className="flex flex-col divide-y divide-border/50 rounded-xl border border-border overflow-hidden">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{doc.file_name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(doc)}
                aria-label={t("delete")}
                className="text-muted-foreground hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Extract action */}
      {docs.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExtract}
          disabled={extracting}
          className={cn("self-start gap-1.5", extracting && "opacity-70")}
        >
          {extracting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          )}
          {extracting ? t("extracting") : t("extract")}
        </Button>
      )}

      {extracted && (
        <ExtractionReviewPanel
          keys={FIELD_ORDER.filter((k) => extracted[k] !== undefined)}
          fieldFor={(k) => extracted[k as WishlistFieldKey]!}
          label={(k) => tExpose(`fields.${k}`)}
          currentValue={(k) => currentValueFor(k as WishlistFieldKey, current)}
          formatValue={(k, v) => formatFieldValue(k as WishlistFieldKey, v)}
          onApply={(selected) => {
            onApply(buildPatch(selected as WishlistFieldKey[], extracted));
            setExtracted(null);
          }}
        />
      )}
    </div>
  );
}
