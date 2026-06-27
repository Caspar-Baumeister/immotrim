import Image from "next/image"; // used by top-nav logo
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check, Download } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/dal";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = { params: Promise<{ locale: string }> };

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

  const steps = [
    { title: t("steps.s1Title"), desc: t("steps.s1Desc"), image: "/step1.png" },
    { title: t("steps.s2Title"), desc: t("steps.s2Desc"), image: "/step2.png" },
    { title: t("steps.s3Title"), desc: t("steps.s3Desc"), image: "/step3.png" },
  ];

  return (
    <main className="min-h-screen">
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
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight text-balance hyphens-auto break-words"
        >
          {t("hero.title")}
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

      {/* Product demo video */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-border overflow-hidden aspect-[16/9]">
          <iframe
            src="https://www.youtube-nocookie.com/embed/Xsqcq9AA9OI"
            title="Immotrim"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-20 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">{t("steps.title")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("steps.subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {steps.map(({ title, desc, image }, i) => (
            <div key={title} className="relative rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="hidden sm:flex absolute -right-4 top-[28%] -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-amber-500"
                >
                  →
                </span>
              )}
              <div className="relative aspect-[16/10] w-full bg-muted border-b border-border">
                <Image
                  src={image}
                  alt={title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-6 space-y-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                {i === 2 && (
                  <div className="mt-2 space-y-3">
                    <a
                      href="/beispiel-selbstauskunft.pdf"
                      download
                      className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-3 py-2 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      {t("steps.s3Download")}
                    </a>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">{t("steps.s3CtaText")}</p>
                      <Link
                        href={`/${locale}/signup`}
                        className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                      >
                        {t("steps.s3CtaButton")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

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
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
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
          <h2 className="text-3xl font-bold tracking-tight">{t("pricing.title")}</h2>
          <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
        <PricingCards locale={locale} />
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
