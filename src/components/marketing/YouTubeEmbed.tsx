"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Play, ExternalLink } from "lucide-react";
import { useYouTubeConsent, setYouTubeConsent } from "./youtube-consent";

// Two-click ("2-Klick-Lösung") YouTube embed.
//
// Privacy: before the user explicitly consents, NOTHING from Google/YouTube is
// requested — no iframe, no script, no thumbnail. We show a locally hosted
// poster (public/video-poster.svg) plus a notice. Only after a click do we
// insert the iframe, and only via youtube-nocookie.com (privacy-enhanced mode).
//
// Consent can optionally be remembered in localStorage so future visits auto-load
// the video. The choice is revocable on the /privacy-settings page.
export function YouTubeEmbed({
  videoId,
  locale,
  poster = "/video-poster.svg",
}: {
  videoId: string;
  locale: string;
  poster?: string;
}) {
  const t = useTranslations("youtube");
  // Persisted consent (auto-loads on future visits when granted).
  const consented = useYouTubeConsent();
  // One-off load for this view when the user did NOT tick "remember".
  const [clickedThisSession, setClickedThisSession] = useState(false);
  // "Remember my choice" checkbox.
  const [remember, setRemember] = useState(false);

  const activated = consented || clickedThisSession;

  function loadVideo() {
    if (remember) {
      setYouTubeConsent(true);
    } else {
      setClickedThisSession(true);
    }
  }

  if (activated) {
    return (
      <iframe
        // youtube-nocookie.com = privacy-enhanced mode. autoplay so the click that
        // granted consent also starts playback (expected UX for a 2-click embed).
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        title="Immotrim"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="h-full w-full"
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Locally hosted preview — NOT the YouTube thumbnail, so no Google request. */}
      <Image
        src={poster}
        alt={t("posterAlt")}
        fill
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="object-cover"
        // Local SVG poster — bypass the image optimizer (it rejects SVG by default).
        unoptimized
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/55 px-6 text-center backdrop-blur-[2px]">
        <button
          type="button"
          onClick={loadVideo}
          aria-label={t("loadVideo")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/40"
        >
          <Play className="h-7 w-7 translate-x-0.5 fill-current" />
        </button>

        <p className="max-w-xl text-sm text-white/90">
          {t.rich("notice", {
            link: (chunks) => (
              <Link
                href={`/${locale}/datenschutz`}
                className="font-medium text-amber-300 underline underline-offset-4 hover:text-amber-200"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadVideo}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            <Play className="h-4 w-4 fill-current" />
            {t("loadVideo")}
          </button>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <ExternalLink className="h-4 w-4" />
            {t("openOnYouTube")}
          </a>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/75">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 accent-amber-500"
          />
          {t("remember")}
        </label>
      </div>
    </div>
  );
}
