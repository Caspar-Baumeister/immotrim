import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession, getActiveSubscription } from "@/lib/dal";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { PortfolioChatLauncher } from "@/features/portfolio-chat/PortfolioChatLauncher";

// Everything under (app)/ is gated, user-specific app UI — never index it.
export const metadata: Metadata = { robots: { index: false } };

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Secure entitlement gate. Anything under (app)/ requires:
//   1. a Supabase session (else → /[locale]/login)
//   2. an active subscription (else → /[locale]/pricing)
// proxy.ts does the optimistic redirect; this is the source of truth.
export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const user = await verifySession(locale);
  const sub = await getActiveSubscription(user.id);
  if (!sub) redirect(`/${locale}/pricing`);
  return (
    <>
      <TrialBanner locale={locale} status={sub.status} currentPeriodEnd={sub.current_period_end} />
      {children}
      <PortfolioChatLauncher />
    </>
  );
}
