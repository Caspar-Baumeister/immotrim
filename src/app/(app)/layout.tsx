import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  verifySession,
  getActiveSubscription,
  getProfileCompletion,
} from "@/lib/dal";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PortfolioChatLauncher } from "@/features/portfolio-chat/PortfolioChatLauncher";

// Everything under (app)/ is gated, user-specific app UI — never index it.
export const metadata: Metadata = { robots: { index: false } };

type Props = {
  children: React.ReactNode;
};

// Secure entitlement gate + persistent app shell. Anything under (app)/ requires:
//   1. a Supabase session (else → /login)
//   2. an active subscription (else → /pricing)
// proxy.ts does the optimistic redirect; this is the source of truth. The shell
// renders the left Sidebar (with section completion bars) and a content column.
export default async function AppLayout({ children }: Props) {
  const user = await verifySession();
  const sub = await getActiveSubscription(user.id);
  if (!sub) redirect(`/pricing`);
  const completion = await getProfileCompletion(user.id);
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar completion={completion} />
      <div className="flex-1 flex flex-col min-w-0">
        <TrialBanner status={sub.status} currentPeriodEnd={sub.current_period_end} />
        <MobileNav />
        {children}
        <PortfolioChatLauncher />
      </div>
    </div>
  );
}
