import Link from "next/link";
import Image from "next/image";
import { SiteFooter } from "./SiteFooter";

// Shared chrome for the static legal pages (Impressum / Datenschutz / AGB).
export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href={"/"} className="flex items-center gap-2">
            <Image
              src="/logo_immotrim.svg"
              alt="Immotrim"
              width={28}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
            <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
              IMMOTRIM
            </span>
          </Link>
        </div>
      </nav>

      <section className="flex-1 mx-auto w-full max-w-3xl px-6 py-16 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:pt-4 [&_a]:text-[#6c5ce7] [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
