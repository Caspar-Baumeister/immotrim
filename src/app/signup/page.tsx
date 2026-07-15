import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "./SignupForm";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata: Metadata = { robots: { index: false, follow: true } };

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const { plan } = await searchParams;
  const t = await getTranslations("auth");
  const selectedPlan = plan === "yearly" ? "yearly" : "monthly";

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href={"/"} className="flex items-center gap-2">
            <Image
              src="/logo_immotrim.svg"
              alt="Immotrim"
              width={28}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
            <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
              IMMOTRIM
            </span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("signupSubtitle")}</p>
          </div>

          <SignupForm plan={selectedPlan} />

          <GoogleSignInButton
            label={t("continueWithGoogle")}
            dividerLabel={t("or")}
          />

          <p className="text-sm text-center text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href={`/login`} className="text-[#6c5ce7] hover:text-[#6c5ce7] underline underline-offset-4">
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
