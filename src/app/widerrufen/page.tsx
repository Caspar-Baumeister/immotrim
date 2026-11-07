import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { ContractForm } from "@/components/landing/ContractForm";
import { LandingFooter, LandingNav } from "@/components/landing/SiteChrome";

export const metadata: Metadata = {
  title: "Vertrag widerrufen",
  description: "Widerrufe dein Abo bei Immotrim, ohne Anmeldung.",
  alternates: alternates("/widerrufen"),
};

/** § 356a BGB: the confirmation page behind the withdrawal button in the footer. */
export default function WithdrawPage() {
  return (
    <div className="landing min-h-dvh">
      <LandingNav />
      <main className="mx-auto max-w-[560px] px-4 pb-24 pt-12 md:px-6 md:pt-16">
        <ContractForm kind="withdraw" />
      </main>
      <LandingFooter />
    </div>
  );
}
