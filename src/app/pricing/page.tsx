import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { alternates } from "@/lib/seo";
import { PricingCards } from "@/components/marketing/PricingCards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.pricing");
  return { title: t("title"), alternates: alternates("/pricing") };
}

export default async function PricingPage() {
  const t = await getTranslations("landing.pricing");

  return (
    <main className="min-h-screen">
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

      <section className="mx-auto max-w-5xl px-6 py-20 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PricingCards />
      </section>
    </main>
  );
}
