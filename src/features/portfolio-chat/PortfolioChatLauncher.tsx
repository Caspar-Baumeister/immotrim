"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { PortfolioChatPanel } from "./PortfolioChatPanel";

// Extracts the property id from a `…/property/<id>` route so the assistant knows
// which property the user is currently viewing. Excludes `/property/new`.
function currentPropertyId(pathname: string): string | undefined {
  const m = pathname.match(/\/property\/([^/]+)/);
  const id = m?.[1];
  return id && id !== "new" ? id : undefined;
}

// Floating launcher mounted once in the (app) layout, so the portfolio assistant
// is reachable from every authenticated page. Lazy: the panel's chat state only
// exists while open.
export function PortfolioChatLauncher() {
  const t = useTranslations("portfolioChat");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The assistant is portfolio-scoped, so it doesn't belong in the Objektanalyse
  // (wishlist) section — hide it there entirely.
  if (/\/wishlist(\/|$)/.test(pathname)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("title")}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg ring-1 ring-foreground/10 transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">{t("launcher")}</span>
      </button>
      {open && (
        <PortfolioChatPanel
          open={open}
          onOpenChange={setOpen}
          currentPropertyId={currentPropertyId(pathname)}
        />
      )}
    </>
  );
}
