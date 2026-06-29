import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SelbstauskunftFlow } from "@/features/selbstauskunft/components/SelbstauskunftFlow";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// The interactive funnel itself — not for indexing.
export const metadata: Metadata = { robots: { index: false } };

type Props = { params: Promise<{ locale: string }> };

export default async function SelbstauskunftStartPage({ params }: Props) {
  const { locale } = await params;

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href={`/${locale}/selbstauskunft`} className="flex items-center gap-2">
            <Image
              src="/logo_immotrim.png"
              alt="Immotrim"
              width={100}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
            <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
              IMMOTRIM
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <SelbstauskunftFlow locale={locale} />
      </section>
    </main>
  );
}
