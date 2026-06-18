"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteReportImage,
  getReportImageUrl,
  uploadReportImage,
  type ReportImage,
  type ReportImageTarget,
} from "../report-images-service";

type Props = {
  target: ReportImageTarget;
  // Already-filtered images for this target.
  images: ReportImage[];
  max: number;
  label: string;
  onChanged: () => void;
  compact?: boolean;
};

export function ReportImageUploader({
  target,
  images,
  max,
  label,
  onChanged,
  compact,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // Resolve short-lived signed URLs for thumbnail previews.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      images.map(async (img) => [img.id, await getReportImageUrl(img.file_path)] as const)
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [id, url] of entries) if (url) next[id] = url;
      setUrls(next);
    });
    return () => {
      cancelled = true;
    };
  }, [images]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = max - images.length;
    const toUpload = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);
    if (toUpload.length === 0) return;
    setBusy(true);
    try {
      for (const file of toUpload) await uploadReportImage(file, target);
      onChanged();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (img: ReportImage) => {
    setBusy(true);
    try {
      await deleteReportImage(img);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const atLimit = images.length >= max;
  const thumb = compact ? "h-14 w-14" : "h-20 w-20";

  return (
    <div className="flex flex-col gap-2">
      {!compact && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {images.map((img) => (
          <div
            key={img.id}
            className={cn("relative rounded-md overflow-hidden border border-border bg-muted", thumb)}
          >
            {urls[img.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[img.id]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
            <button
              type="button"
              onClick={() => handleDelete(img)}
              disabled={busy}
              className="absolute top-0.5 right-0.5 rounded bg-black/55 p-0.5 text-white hover:bg-black/75"
              aria-label="Bild entfernen"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors",
              thumb
            )}
            aria-label={compact ? label : "Bild hinzufügen"}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
