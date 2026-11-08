import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { verifySession, getSubscription, isEntitled } from "@/lib/dal";
import { startPortalAction } from "@/app/billing/actions";
import { TopBar } from "@/components/layout/TopBar";
import { LogoutButton } from "@/features/account/LogoutButton";
import { DeleteAccount } from "@/features/account/DeleteAccount";
import { DisplayNameForm } from "@/features/account/DisplayNameForm";
import { getUserDoc } from "@/lib/data/users";

export default async function AccountPage() {
  const user = await verifySession();
  const [sub, doc] = await Promise.all([getSubscription(user.uid), getUserDoc(user.uid)]);
  const t = await getTranslations("account");
  const plus = isEntitled(sub);

  const plan = !plus
    ? t("freePlan")
    : sub?.plan_interval === "lifetime"
    ? t("lifetime")
    : sub?.plan_interval === "year" || sub?.plan_interval === "yearly"
    ? t("yearly")
    : t("monthly");
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("de-DE")
    : null;
  const periodEndLabel = sub?.cancel_at_period_end ? t("endsOn") : t("renewsOn");

  return (
    <>
      <TopBar userEmail={user.email ?? null} />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <header>
          <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--ink)]">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">{t("subscription")}</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("plan")}</dt>
            <dd>{plan}</dd>
            {plus && periodEnd && sub?.plan_interval !== "lifetime" && (
              <>
                <dt className="text-muted-foreground">{periodEndLabel}</dt>
                <dd>{periodEnd}</dd>
              </>
            )}
          </dl>

          <div className="flex flex-wrap gap-3">
            {!plus && (
              <Link
                href={`/pricing`}
                className="inline-block rounded-lg bg-[#6c5ce7] hover:bg-[#7b6cf0] text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                {t("upgrade")}
              </Link>
            )}
            {sub?.stripe_customer_id && (
              // Stripe's portal: change or cancel the plan, payment method, invoices.
              <form action={startPortalAction}>
                <button
                  type="submit"
                  className={plus
                    ? "rounded-lg bg-[#6c5ce7] hover:bg-[#7b6cf0] text-white text-sm font-medium px-4 py-2 transition-colors"
                    : "rounded-lg border border-border text-sm font-medium px-4 py-2 hover:bg-accent transition-colors"}
                >
                  {t("managePortal")}
                </button>
              </form>
            )}
          </div>
          {sub?.stripe_customer_id && (
            <p className="text-xs text-muted-foreground">{t("portalHint")}</p>
          )}
          {/* § 312k and § 356a BGB, also reachable without signing in from every footer. */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <Link href="/kuendigen" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">Verträge hier kündigen</Link>
            <Link href="/widerrufen" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">Vertrag widerrufen</Link>
          </div>
        </section>

        <DisplayNameForm initial={doc?.displayName ?? ""} />

        <section>
          <LogoutButton label={t("logout")} />
        </section>

        <DeleteAccount />
      </main>
    </>
  );
}
