import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = { params: Promise<{ locale: string }> };

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("auth");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur">
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
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">{t("resetTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("resetSubtitle")}</p>
          </div>

          <ResetPasswordForm locale={locale} />
        </div>
      </div>
    </main>
  );
}
