import type { Metadata } from "next";
import { verifySession, hasPlus, FREE_PROPERTY_LIMIT } from "@/lib/dal";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AccountProvider } from "@/features/account/account-context";

// Everything under (app)/ is gated, user-specific app UI — never index it.
export const metadata: Metadata = { robots: { index: false } };

// Login gate + persistent app shell. Free accounts get the full app for one
// property; Plus features are gated where they are used.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await verifySession();
  const plus = await hasPlus(user.uid);
  return (
    <AccountProvider value={{ email: user.email, plus, freePropertyLimit: FREE_PROPERTY_LIMIT }}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav />
          {children}
        </div>
      </div>
    </AccountProvider>
  );
}
