import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternates } from "@/lib/seo";
import { PricingCards } from "@/components/marketing/PricingCards";
import { LandingFooter, LandingNav } from "@/components/landing/SiteChrome";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.pricing");
  return { title: t("title"), alternates: alternates("/pricing") };
}

export default async function PricingPage() {
  const t = await getTranslations("landing.pricing");

  return (
    <div className="landing min-h-dvh overflow-x-clip">
      <LandingNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-14 md:px-6 md:pt-24">
        <h1 className="max-w-[900px] text-[38px] font-bold leading-[1.02] tracking-[-0.035em] text-[var(--ink)] sm:text-[62px]">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-[700px] text-[20px] leading-[1.3] text-muted-foreground sm:text-[26px]">{t("subtitle")}</p>
        <div className="mt-14">
          <PricingCards />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
