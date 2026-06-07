import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Shared marketing/public footer with the legally-required German links.
export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations("landing");
  const tl = await getTranslations("legal");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} {t("footer")}</span>
        <nav className="flex items-center gap-4">
          <Link href={`/${locale}/impressum`} className="hover:text-foreground transition-colors">{tl("impressum.title")}</Link>
          <Link href={`/${locale}/datenschutz`} className="hover:text-foreground transition-colors">{tl("datenschutz.title")}</Link>
          <Link href={`/${locale}/agb`} className="hover:text-foreground transition-colors">{tl("agb.title")}</Link>
        </nav>
      </div>
    </footer>
  );
}
