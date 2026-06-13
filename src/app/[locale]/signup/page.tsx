import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "./SignupForm";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
};

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { plan } = await searchParams;
  const t = await getTranslations("auth");
  const selectedPlan = plan === "yearly" ? "yearly" : "monthly";

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
            <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("signupSubtitle")}</p>
          </div>

          <SignupForm locale={locale} plan={selectedPlan} />

          <GoogleSignInButton
            locale={locale}
            label={t("continueWithGoogle")}
            dividerLabel={t("or")}
          />

          <p className="text-sm text-center text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href={`/${locale}/login`} className="text-amber-400 hover:text-amber-300 underline underline-offset-4">
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
