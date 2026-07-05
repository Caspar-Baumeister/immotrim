import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Minimal, auth-free header for the public share page. Unlike the app TopBar it
// has no nav, account menu, or sign-out — just the logo, theme toggle, and a
// single CTA that sends anonymous viewers to the landing page.
export async function PublicShareHeader({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "share" });

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src="/logo_immotrim.png"
            alt="Immotrim"
            width={100}
            height={28}
            className="h-6 sm:h-7 w-auto object-contain"
            priority
          />
          <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
            IMMOTRIM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={`/${locale}`}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </header>
  );
}
