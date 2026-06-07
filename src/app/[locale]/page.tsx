import Image from "next/image"; // used by top-nav logo
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ScanText, SlidersHorizontal, TrendingUp } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/dal";
import { PricingCards } from "@/components/marketing/PricingCards";
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

  const features = [
    { icon: ScanText, title: t("features.f1Title"), desc: t("features.f1Desc") },
    { icon: SlidersHorizontal, title: t("features.f2Title"), desc: t("features.f2Desc") },
    { icon: TrendingUp, title: t("features.f3Title"), desc: t("features.f3Desc") },
  ];

  return (
    <main className="min-h-screen">
      {/* Top nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center">
            <Image
              src="/logo_immotrim.png"
              alt="Immotrim"
              width={100}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
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
        <p className="text-xs uppercase tracking-widest text-amber-400/80">
          {t("hero.eyebrow")}
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
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
      </section>

      {/* Product screenshot placeholder — drop image into /public/landing/hero.png */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-border bg-card overflow-hidden aspect-[16/9] flex items-center justify-center text-muted-foreground text-xs">
          Add a screenshot at <code className="px-1 mx-1 bg-foreground/5 rounded">/public/landing/hero.png</code>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">{t("features.title")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("features.subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
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

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("footer")}
        </div>
      </footer>
    </main>
  );
}
