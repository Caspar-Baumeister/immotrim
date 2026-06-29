import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Check,
  FileCheck2,
  ScanSearch,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { alternates } from "@/lib/seo";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "selbstauskunft" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternates(locale, "/selbstauskunft"),
  };
}

export default async function SelbstauskunftLanding({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "selbstauskunft" });

  const start = `/${locale}/selbstauskunft/start`;

  const badges = [
    { icon: ShieldCheck, label: t("trust.b1") },
    { icon: Check, label: t("trust.b2") },
    { icon: FileCheck2, label: t("trust.b3") },
  ];

  const steps = [
    { icon: Upload, title: t("how.s1Title"), desc: t("how.s1Desc") },
    { icon: ScanSearch, title: t("how.s2Title"), desc: t("how.s2Desc") },
    { icon: FileCheck2, title: t("how.s3Title"), desc: t("how.s3Desc") },
  ];

  return (
    <main className="min-h-screen">
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
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <Link
              href={`/${locale}/login`}
              className="text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              {t("nav.login")}
            </Link>
            <Link
              href={start}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {t("nav.cta")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400/80">
          {t("hero.eyebrow")}
        </p>
        <h1
          lang={locale}
          className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight text-balance"
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={start}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {t("hero.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="/beispiel-selbstauskunft.pdf"
            download
            className="text-muted-foreground hover:text-foreground px-5 py-2.5 rounded-lg hover:bg-foreground/5 transition-colors"
          >
            {t("hero.secondary")}
          </a>
        </div>
        <p className="inline-flex max-w-full items-center gap-2 mx-auto text-center text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
          <Check className="h-4 w-4" />
          {t("hero.ctaNote")}
        </p>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center space-y-4">
          <p className="font-medium text-foreground">{t("trust.line")}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {badges.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-amber-500" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
            {t("how.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("how.subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="relative rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Icon className="h-5 w-5" />
              </div>
              <div className="absolute top-6 right-6 text-2xl font-bold text-foreground/10">
                {i + 1}
              </div>
              <h3 className="font-heading text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-12 text-center space-y-5">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            {t("cta.title")}
          </h2>
          <p className="text-muted-foreground">{t("cta.subtitle")}</p>
          <Link
            href={start}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {t("cta.button")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
