import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Minimal, auth-free header for the public share page. Unlike the app TopBar it
// has no nav, account menu, or sign-out — just the logo, theme toggle, and a
// single CTA that sends anonymous viewers to the landing page.
export async function PublicShareHeader() {
  const t = await getTranslations("share");

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src="/logo_immotrim.svg"
            alt="Immotrim"
            width={28}
            height={28}
            className="h-6 sm:h-7 w-auto object-contain"
            priority
          />
          <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
            IMMOTRIM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={"/"}
            className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </header>
  );
}
