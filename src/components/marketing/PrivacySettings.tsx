"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useYouTubeConsent, setYouTubeConsent } from "./youtube-consent";

// Lets the user review and change the only stored consent decision: whether
// YouTube videos may load automatically. Revoking clears the localStorage flag,
// so the two-click notice returns on the next page that embeds a video.
export function PrivacySettings() {
  const t = useTranslations("privacySettings");
  const granted = useYouTubeConsent();

  return (
    <div className="rounded-xl border border-border bg-card p-5 not-prose">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{t("youtubeTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("youtubeDesc")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            granted
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {granted ? t("statusGranted") : t("statusNotGranted")}
        </span>

        {granted ? (
          <Button variant="outline" onClick={() => setYouTubeConsent(false)}>
            <RotateCcw className="h-4 w-4" />
            {t("revoke")}
          </Button>
        ) : (
          <Button onClick={() => setYouTubeConsent(true)}>{t("allow")}</Button>
        )}
      </div>
    </div>
  );
}
