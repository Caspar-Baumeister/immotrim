import type { Metadata } from "next";
import { alternates } from "@/lib/seo";
import { ContractForm } from "@/components/landing/ContractForm";
import { LandingFooter, LandingNav } from "@/components/landing/SiteChrome";

export const metadata: Metadata = {
  title: "Verträge hier kündigen",
  description: "Kündige dein Abo bei Immotrim, ohne Anmeldung.",
  alternates: alternates("/kuendigen"),
};

/** § 312k BGB: the confirmation page behind the cancel button in the footer. */
export default function CancelPage() {
  return (
    <div className="landing min-h-dvh">
      <LandingNav />
      <main className="mx-auto max-w-[560px] px-4 pb-24 pt-12 md:px-6 md:pt-16">
        <ContractForm kind="cancel" />
      </main>
      <LandingFooter />
    </div>
  );
}
