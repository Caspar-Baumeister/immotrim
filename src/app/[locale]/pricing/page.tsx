import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/marketing/PricingCards";

type Props = { params: Promise<{ locale: string }> };

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("landing.pricing");

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border bg-[#0d0d0d]">
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
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-20 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PricingCards locale={locale} />
      </section>
    </main>
  );
}
