import { redirect } from "next/navigation";
import { verifySession, getActiveSubscription } from "@/lib/dal";

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
  return <>{children}</>;
}
