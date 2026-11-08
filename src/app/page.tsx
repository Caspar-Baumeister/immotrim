import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { getBaseUrl } from "@/lib/url";
import { alternates } from "@/lib/seo";
import { ChartShowcase } from "@/components/marketing/ChartShowcase";
import { fetchPriceAmount } from "@/components/marketing/PricingCards";
import { ForcesStack } from "@/components/landing/ForcesStack";
import { HeroGraph } from "@/components/landing/HeroGraph";
import { HeroWindow } from "@/components/landing/HeroWindow";
import { LandingVideo } from "@/components/landing/LandingVideo";
import { LandingFooter, LandingNav } from "@/components/landing/SiteChrome";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: alternates("") };
}

const H2 = "text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--ink)] md:text-[52px]";
const BODY = "text-[18px] leading-[1.55] text-muted-foreground md:text-[21px]";

/** Built after the Pairspace landing: hero window, video, forces, upload, charts, bank, promise. */
export default async function LandingPage() {
  // Logged in → straight to the app.
  if (await getSessionUser()) redirect(`/dashboard`);

  const t = await getTranslations("landing");
  const tSeo = await getTranslations("seo");
  const [monthly, yearly] = await Promise.all([
    fetchPriceAmount(process.env.STRIPE_PRICE_MONTHLY!),
    fetchPriceAmount(process.env.STRIPE_PRICE_YEARLY!),
  ]);

  const base = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Immotrim",
    url: `${base}`,
    logo: `${base}/immotrim-mark.svg`,
    description: tSeo("siteDescription"),
  };

  const forces = ["principal", "appreciation", "rent", "inflation", "leverage", "refinance"] as const;
  const promises = ["overview", "documents", "privacy"] as const;
  const slides = ["wealth", "cashflow", "amortization", "equity", "value", "yield"].map((k) => ({
    title: t(`showcase.${k}.title`),
    what: t(`showcase.${k}.what`),
    why: t(`showcase.${k}.why`),
  }));
  const videoLabels = { playLabel: t("video.play"), pauseLabel: t("video.pause") };

  return (
    <div className="landing min-h-dvh overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main>
        <section className="relative -mt-16 overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#0f0f12_70%,#161616_100%)] pt-16">
          {/* Light falling on the chart, and the faint beams across the floor. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_46%_60%_at_74%_42%,rgba(108,92,231,0.16),transparent_70%),linear-gradient(112deg,transparent_58%,rgba(255,255,255,0.045)_70%,transparent_82%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-[10%] bottom-[14%] h-px w-[120%] rotate-[9deg] bg-gradient-to-r from-transparent via-white/15 to-transparent blur-[2px]"
          />
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-4 px-4 pt-10 md:min-h-[calc(100dvh-4rem)] md:grid-cols-[1.04fr_1fr] md:px-6 md:pt-0">
            <div>
              <h1 className="rise-in text-[38px] font-bold leading-[1.03] tracking-[-0.035em] text-[var(--ink)] sm:text-[52px] lg:text-[66px]">
                {t("hero.title")}
              </h1>
              <p
                className="rise-in mt-6 max-w-[520px] text-[20px] leading-[1.28] tracking-[-0.012em] text-muted-foreground sm:text-[24px] lg:text-[27px]"
                style={{ animationDelay: "120ms" }}
              >
                {t("hero.subtitle")}
              </p>
              <div className="rise-in mt-9 flex flex-wrap items-center gap-x-7 gap-y-3" style={{ animationDelay: "220ms" }}>
                <Link
                  href="/signup"
                  className="inline-flex h-14 items-center rounded-xl bg-[#6c5ce7] px-7 text-[18px] font-semibold text-white transition-colors hover:bg-[#7b6cf0]"
                >
                  {t("hero.ctaPrimary")}
                </Link>
                <a href="#video" className="text-[18px] font-medium text-[var(--violet)] hover:text-[#a99ff7]">
                  {t("hero.ctaVideo")}
                </a>
              </div>
              <p className="rise-in mt-4 text-sm text-[var(--faint)]" style={{ animationDelay: "260ms" }}>
                {t("hero.freeNote")}
              </p>
            </div>
            <div className="h-[340px] sm:h-[440px] md:h-[560px] lg:-mr-10 lg:h-[660px] xl:-mr-20">
              <HeroGraph label={t("hero.graphLabel")} value={t("forces.total")} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pt-10 md:px-6 md:pt-16">
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-24 -top-28 bottom-1/3 bg-[radial-gradient(ellipse_at_50%_40%,rgba(108,92,231,0.14),transparent_62%)]"
            />
            <div className="relative">
              <HeroWindow />
            </div>
          </div>
        </section>

        <section id="video" className="mx-auto max-w-[1000px] scroll-mt-20 px-4 pt-28 md:px-6 md:pt-40">
          <h2 className={`${H2} text-center`}>{t("video.title")}</h2>
          <div className="mt-8 md:mt-10">
            <LandingVideo name="immotrim-promo" label={t("video.label")} {...videoLabels} />
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pt-28 md:grid-cols-[1fr_1fr] md:px-6 md:pt-40">
          <div>
            <h2 className={H2}>{t("forces.title")}</h2>
            <p className={`mt-6 max-w-[520px] ${BODY}`}>{t("forces.body")}</p>
          </div>
          <ForcesStack
            labels={{
              napkin: t("forces.napkin"),
              napkinValue: t("forces.napkinValue"),
              immotrim: t("forces.immotrim"),
              total: t("forces.total"),
              leverage: t("forces.leverage"),
            }}
          />
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-x-10 gap-y-8 px-4 pt-16 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
          {forces.map((k) => (
            <p key={k} className="text-[17px] leading-[1.5] text-muted-foreground">
              <span className="block font-semibold text-[var(--ink)]">{t(`forces.items.${k}.title`)}</span>
              {t(`forces.items.${k}.body`)}
            </p>
          ))}
        </section>

        <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pt-28 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:pt-40">
          <div>
            <h2 className={H2}>{t("upload.title")}</h2>
            <p className={`mt-6 max-w-[500px] ${BODY}`}>{t("upload.body")}</p>
          </div>
          <LandingVideo name="upload" label={t("upload.label")} {...videoLabels} />
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pt-28 md:px-6 md:pt-40">
          <h2 className={`${H2} text-center`}>{t("charts.title")}</h2>
          <p className={`mx-auto mt-5 max-w-[640px] text-center ${BODY}`}>{t("charts.subtitle")}</p>
          <div className="mt-10">
            <ChartShowcase
              slides={slides}
              labels={{
                prev: t("showcase.prev"),
                next: t("showcase.next"),
                goto: t("showcase.goto"),
                whyLabel: t("showcase.whyLabel"),
              }}
            />
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pt-28 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:pt-40">
          <LandingVideo name="bank" label={t("bank.label")} className="max-md:order-2" {...videoLabels} />
          <div>
            <h2 className={H2}>{t("bank.title")}</h2>
            <p className={`mt-6 max-w-[500px] ${BODY}`}>{t("bank.body")}</p>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 py-28 md:grid-cols-[1.1fr_1fr] md:px-6 md:py-40">
          <div className="space-y-9">
            {promises.map((k) => (
              <p key={k} className="max-w-[540px] text-[20px] leading-[1.45] text-muted-foreground md:text-[24px]">
                <span className="block font-semibold text-[var(--ink)]">{t(`promises.${k}.title`)}</span>
                {t(`promises.${k}.body`)}
              </p>
            ))}
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <div className="flex h-36 w-36 items-center justify-center rounded-[32px] border border-[var(--line-strong)] bg-[#161616] shadow-[0_24px_70px_rgba(108,92,231,0.2)]">
              <Image src="/immotrim-mark.svg" alt="" width={84} height={84} />
            </div>
            <div className="mt-7 text-[38px] font-bold tracking-[-0.03em] text-[var(--ink)]">{t("plan.name")}</div>
            <div className="mt-8 text-[22px] font-semibold text-[var(--ink)]">{t("plan.free")}</div>
            <div className="mt-1 max-w-[340px] text-[18px] text-muted-foreground">
              {monthly && yearly ? t("plan.plus", { monthly, yearly }) : t("plan.plusFallback")}
            </div>
            <Link href="/signup" className="mt-5 text-[18px] font-medium text-[var(--violet)] hover:text-[#a99ff7]">
              {t("plan.cta")}
            </Link>
            <Link href="/pricing" className="mt-2 text-sm text-[var(--faint)] hover:text-[var(--ink)]">
              {t("plan.all")}
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
