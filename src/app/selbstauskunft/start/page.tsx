import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SelbstauskunftFlow } from "@/features/selbstauskunft/components/SelbstauskunftFlow";

// The interactive funnel itself — not for indexing.
export const metadata: Metadata = { robots: { index: false } };

export default async function SelbstauskunftStartPage() {

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href={`/selbstauskunft`} className="flex items-center gap-2">
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

      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <SelbstauskunftFlow />
      </section>
    </main>
  );
}
