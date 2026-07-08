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
import { AiShowcase } from "@/components/marketing/AiShowcase";
import { SelbstauskunftTeaser } from "@/components/marketing/SelbstauskunftTeaser";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { YouTubeEmbed } from "@/components/marketing/YouTubeEmbed";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternates(locale, "") };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;

  // Already logged in with an active subscription → straight to portfolio.
  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const sub = await getActiveSubscription(user.id);
    if (sub) redirect(`/${locale}/portfolio`);
  }

  const t = await getTranslations("landing");
  const tSeo = await getTranslations("seo");

  const base = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Immotrim",
    url: `${base}/${locale}`,
    logo: `${base}/logo_immotrim.png`,
    description: tSeo("siteDescription"),
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Beta banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-center text-xs sm:text-sm py-2 px-4 text-amber-700 dark:text-amber-300">
        {t("beta.banner")}
      </div>

      {/* Top nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
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
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.5">
              {t("beta.badge")}
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <Link
              href={`/${locale}/login`}
              className="text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              {t("hero.ctaSecondary")}
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
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
            <p className="text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-amber-400/80">
              {t("hero.eyebrow")}
            </p>
            <h1
              lang={locale}
              className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-balance hyphens-auto break-words"
            >
              {t.rich("hero.title", {
                mark: (chunks) => (
                  <span className="text-amber-600 dark:text-amber-400">{chunks}</span>
                ),
              })}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <Link
                href={`/${locale}/signup`}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {t("hero.ctaPrimary")}
              </Link>
              <Link
                href={`/${locale}/login`}
                className="text-muted-foreground hover:text-foreground px-6 py-3 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-amber-500" />
              {t("hero.trialNote")}
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Image
              src="/hero.jpg"
              alt={t("hero.imageAlt")}
              width={4479}
              height={4479}
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="w-full aspect-square rounded-2xl border border-border object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Positioning — why prepare financing yourself instead of using a broker. */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center space-y-6">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-amber-400/80">
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
      <SelbstauskunftTeaser locale={locale} />

      {/* Product demo video — two-click consent embed (no Google/YouTube request until opt-in). */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-border overflow-hidden aspect-[16/9]">
          <YouTubeEmbed videoId="Xsqcq9AA9OI" locale={locale} />
        </div>
      </section>

      {/* AI assistant showcase */}
      <AiShowcase locale={locale} />

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">{t("pricing.title")}</h2>
          <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
        <PricingCards locale={locale} />
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
