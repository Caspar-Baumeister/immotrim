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
import { ChartShowcase } from "@/components/marketing/ChartShowcase";
import { HowItWorksSteps } from "@/components/marketing/HowItWorksSteps";
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

  // Slides for the chart showcase — order must match the CHARTS array in
  // ChartShowcase.tsx (Vermögensaufbau, Cashflow, Tilgungsplan, EK-Rendite,
  // Immobilienwert vs. Schulden, Brutto-Mietrendite).
  const showcaseSlides = [1, 2, 3, 4, 5, 6].map((n) => ({
    title: t(`showcase.c${n}Title`),
    what: t(`showcase.c${n}What`),
    why: t(`showcase.c${n}Why`),
  }));
  const showcaseLabels = {
    prev: t("showcase.prev"),
    next: t("showcase.next"),
    goto: t("showcase.goto"),
    whyLabel: t("showcase.whyLabel"),
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

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400/80">
          {t("hero.eyebrow")}
        </p>
        <h1
          lang={locale}
          className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight text-balance hyphens-auto break-words"
        >
          {t.rich("hero.title", {
            mark: (chunks) => (
              <span className="rounded-md bg-amber-500/15 px-1.5 text-amber-700 dark:text-amber-300">
                {chunks}
              </span>
            ),
          })}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("hero.subtitle")}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/${locale}/signup`}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {t("hero.ctaPrimary")}
          </Link>
          <Link
            href={`/${locale}/login`}
            className="text-muted-foreground hover:text-foreground px-5 py-2.5 rounded-lg hover:bg-foreground/5 transition-colors"
          >
            {t("hero.ctaSecondary")}
          </Link>
        </div>
        <p className="inline-flex max-w-full items-center gap-2 mx-auto text-center text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
          <Check className="h-4 w-4" />
          {t("hero.trialNote")}
        </p>
      </section>

      {/* Chart showcase — auto-scrolling slider of the real dashboard charts
          (example data) so visitors immediately see what the product reveals. */}
      <section className="mx-auto max-w-6xl px-6 pb-20 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
            {t("showcase.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("showcase.subtitle")}
          </p>
        </div>
        <ChartShowcase slides={showcaseSlides} labels={showcaseLabels} />
      </section>

      {/* Product demo video — two-click consent embed (no Google/YouTube request until opt-in). */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-border overflow-hidden aspect-[16/9]">
          <YouTubeEmbed videoId="Xsqcq9AA9OI" locale={locale} />
        </div>
      </section>

      {/* How it works */}
      <HowItWorksSteps />

      {/* Bank report / Selbstauskunft funnel teaser */}
      <SelbstauskunftTeaser locale={locale} />

      {/* AI assistant showcase */}
      <AiShowcase locale={locale} />

      {/* About me */}
      <section id="about" className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="mx-auto w-full max-w-sm">
            <Image
              src="/caspar_freundlich.JPG"
              alt={t("about.imageAlt")}
              width={768}
              height={1024}
              className="rounded-2xl border border-border object-cover w-full shadow-sm"
            />
          </div>
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Image
                src="/caspar_square_transparent.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full border border-border bg-card object-cover"
              />
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
                  {t("about.title")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("about.subtitle")}</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">{t("about.p1")}</p>
            <p className="text-muted-foreground leading-relaxed">{t("about.p2")}</p>
            <p className="font-medium text-foreground">{t("about.signature")}</p>
          </div>
        </div>
      </section>

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
