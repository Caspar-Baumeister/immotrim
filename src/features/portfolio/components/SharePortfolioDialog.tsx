"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Loader2, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getOrCreateShareToken } from "@/lib/share-service";

// Shows the user's always-on public share link. The link resolves the token
// server-side and renders a read-only, aggregate-only portfolio dashboard —
// no per-property details are exposed (see the /share/[token] page).
export function SharePortfolioDialog({
  open,
  onOpenChange,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}) {
  const t = useTranslations("share");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getOrCreateShareToken()
      .then((token) => {
        if (cancelled) return;
        setUrl(`${window.location.origin}/${locale}/share/${token}`);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable — the field is selectable as a fallback */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialogSubtitle")}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive">{t("error")}</p>
        ) : !url ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground font-mono outline-none focus:border-foreground/30"
            />
            <Button
              size="sm"
              onClick={copy}
              className="gap-1.5 flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
