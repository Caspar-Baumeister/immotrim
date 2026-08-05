import type { Metadata } from "next";
import Image from "next/image"; // used by top-nav logo
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/dal";
import { getBaseUrl } from "@/lib/url";
import { alternates } from "@/lib/seo";
import { SelbstauskunftTeaser } from "@/components/marketing/SelbstauskunftTeaser";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { YouTubeEmbed } from "@/components/marketing/YouTubeEmbed";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: alternates("") };
}

export default async function LandingPage() {

  // Already logged in with an active subscription → straight to portfolio.
  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const sub = await getActiveSubscription(user.id);
    if (sub) redirect(`/dashboard`);
  }

  const t = await getTranslations("landing");
  const tSeo = await getTranslations("seo");

  const base = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Immotrim",
    url: `${base}`,
    logo: `${base}/logo_immotrim.svg`,
    description: tSeo("siteDescription"),
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Top nav */}
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
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/login`}
              className="text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              {t("hero.ctaSecondary")}
            </Link>
            <Link
              href={`/signup`}
              className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {t("hero.ctaPrimary")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — two-column: positioning statement + hand-holding-documents image. */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-7 text-center lg:text-left">
            <p className="text-xs font-medium uppercase tracking-widest text-[#6c5ce7]">
              {t("hero.eyebrow")}
            </p>
            <h1
              lang="de"
              className="font-heading text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-balance hyphens-auto"
            >
              {t.rich("hero.title", {
                mark: (chunks) => (
                  <span className="text-[#6c5ce7]">{chunks}</span>
                ),
              })}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <Link
                href={`/signup`}
                className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {t("hero.ctaPrimary")}
              </Link>
              <Link
                href={`/login`}
                className="text-muted-foreground hover:text-foreground px-6 py-3 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-[#6c5ce7]" />
              {t("hero.trialNote")}
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Image
              src="/hero.png"
              alt={t("hero.imageAlt")}
              width={1448}
              height={1086}
              priority
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="w-full aspect-[4/3] rounded-2xl border border-border object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Positioning — why prepare financing yourself instead of using a broker. */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center space-y-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[#6c5ce7]">
            {t("problem.eyebrow")}
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t("problem.title")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("problem.body")}
          </p>
          <p className="text-lg font-semibold text-foreground pt-2">
            {t("problem.highlight")}
          </p>
        </div>
      </section>

      {/* Bank report / Selbstauskunft funnel teaser */}
      <SelbstauskunftTeaser />

      {/* Product demo video — two-click consent embed (no Google/YouTube request until opt-in). */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-border overflow-hidden aspect-[16/9]">
          <YouTubeEmbed videoId="Xsqcq9AA9OI" />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">{t("pricing.title")}</h2>
          <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
        <PricingCards />
      </section>

      <SiteFooter />
    </main>
  );
}
