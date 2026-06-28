import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternates } from "@/lib/seo";
import { LegalShell } from "@/components/marketing/LegalShell";
import { PrivacySettings } from "@/components/marketing/PrivacySettings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacySettings" });
  return { title: t("title"), alternates: alternates(locale, "/privacy-settings") };
}

export default async function PrivacySettingsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("privacySettings");

  return (
    <LegalShell locale={locale} title={t("title")}>
      <p>{t("intro")}</p>
      <PrivacySettings />
    </LegalShell>
  );
}
