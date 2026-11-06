import type { Metadata } from "next";
import Image from "next/image"; // used by top-nav logo
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check, ArrowDownRight, TrendingUp, Home, Percent, Scale, Landmark } from "lucide-react";
import { getSessionUser } from "@/lib/firebase/session";
import { getBaseUrl } from "@/lib/url";
import { alternates } from "@/lib/seo";
import { HowItWorksSteps } from "@/components/marketing/HowItWorksSteps";
import { ChartShowcase } from "@/components/marketing/ChartShowcase";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: alternates("") };
}

export default async function LandingPage() {
  // Logged in → straight to the app.
  if (await getSessionUser()) redirect(`/dashboard`);

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

  const forces = [
    { icon: ArrowDownRight, key: "principal" },
    { icon: TrendingUp, key: "appreciation" },
    { icon: Home, key: "rent" },
    { icon: Percent, key: "inflation" },
    { icon: Scale, key: "leverage" },
    { icon: Landmark, key: "refinance" },
  ] as const;

  const slides = ["wealth", "cashflow", "amortization", "equity", "value", "yield"].map((k) => ({
    title: t(`showcase.${k}.title`),
    what: t(`showcase.${k}.what`),
    why: t(`showcase.${k}.why`),
  }));

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

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center space-y-7">
        <p className="text-xs font-medium uppercase tracking-widest text-[#6c5ce7]">
          {t("hero.eyebrow")}
        </p>
        <h1
          lang="de"
          className="font-heading text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] text-balance hyphens-auto"
        >
          {t.rich("hero.title", {
            mark: (chunks) => <span className="text-[#6c5ce7]">{chunks}</span>,
          })}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
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
          {t("hero.freeNote")}
        </p>
      </section>

      {/* What the user sees: the portfolio charts with demo data */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <ChartShowcase
          slides={slides}
          labels={{
            prev: t("showcase.prev"),
            next: t("showcase.next"),
            goto: t("showcase.goto"),
            whyLabel: t("showcase.whyLabel"),
          }}
        />
      </section>

      {/* The problem: many forces at once, a napkin sum sees only one */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20 space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <p className="text-xs font-medium uppercase tracking-widest text-[#6c5ce7]">
              {t("problem.eyebrow")}
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t("problem.title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">{t("problem.body")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {forces.map(({ icon: Icon, key }) => (
              <div key={key} className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6c5ce7]/10">
                  <Icon className="h-4.5 w-4.5 text-[#6c5ce7]" />
                </span>
                <h3 className="font-semibold">{t(`forces.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`forces.${key}.body`)}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-lg font-semibold text-foreground">{t("problem.highlight")}</p>
        </div>
      </section>

      <HowItWorksSteps />

      {/* Bank overview */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 grid gap-6 sm:grid-cols-[1fr_auto] items-center">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-[#6c5ce7]">{t("bank.eyebrow")}</p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">{t("bank.title")}</h2>
            <p className="text-muted-foreground leading-relaxed">{t("bank.body")}</p>
          </div>
          <Landmark className="hidden sm:block h-20 w-20 text-[#6c5ce7]/30" />
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
