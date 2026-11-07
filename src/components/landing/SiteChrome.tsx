import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
      <Image src="/logo_immotrim.svg" alt="" width={22} height={22} className="h-[22px] w-auto" priority />
      Immotrim
    </Link>
  );
}

// Sticky top bar of the dark marketing pages.
export async function LandingNav() {
  const t = await getTranslations("landing.nav");
  return (
    <header className="sticky top-0 z-30 bg-[#161616]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-1 px-4 md:px-6">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 text-sm sm:flex">
          <Link href="/#video" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-[var(--ink)]">
            {t("video")}
          </Link>
          <Link href="/pricing" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-[var(--ink)]">
            {t("pricing")}
          </Link>
        </nav>
        <div className="flex-1" />
        <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-[var(--ink)] max-[400px]:hidden">
          {t("login")}
        </Link>
        <Link href="/signup" className="rounded-md bg-[#6c5ce7] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#7b6cf0]">
          {t("cta")}
        </Link>
      </div>
    </header>
  );
}

export async function LandingFooter() {
  const tl = await getTranslations("legal");
  const t = await getTranslations("landing.nav");
  const links = [
    { href: "/pricing", label: t("pricing") },
    { href: "/login", label: t("login") },
    { href: "/impressum", label: tl("impressum.title") },
    { href: "/datenschutz", label: tl("datenschutz.title") },
    { href: "/agb", label: tl("agb.title") },
  ];
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-8 text-sm text-[var(--faint)] md:px-6">
        <span>© {new Date().getFullYear()} Immotrim</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="transition-colors hover:text-[var(--ink)]">
            {l.label}
          </Link>
        ))}
      </div>
      <ContractLinks className="mx-auto flex max-w-[1200px] flex-wrap gap-x-5 gap-y-2 px-4 pb-8 text-sm md:px-6" />
    </footer>
  );
}

/** § 312k and § 356a BGB: always there, readable, no sign in needed. */
export function ContractLinks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Link href="/kuendigen" className="text-muted-foreground underline underline-offset-2 hover:text-[var(--ink)]">
        Verträge hier kündigen
      </Link>
      <Link href="/widerrufen" className="text-muted-foreground underline underline-offset-2 hover:text-[var(--ink)]">
        Vertrag widerrufen
      </Link>
    </div>
  );
}
