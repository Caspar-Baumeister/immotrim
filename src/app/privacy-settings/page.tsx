import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternates } from "@/lib/seo";
import { LegalShell } from "@/components/marketing/LegalShell";
import { PrivacySettings } from "@/components/marketing/PrivacySettings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacySettings");
  return { title: t("title"), alternates: alternates("/privacy-settings") };
}

export default async function PrivacySettingsPage() {
  const t = await getTranslations("privacySettings");

  return (
    <LegalShell title={t("title")}>
      <p>{t("intro")}</p>
      <PrivacySettings />
    </LegalShell>
  );
}
