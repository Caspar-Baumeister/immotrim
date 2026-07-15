import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { verifySession, getSubscription } from "@/lib/dal";
import { startPortalAction } from "@/app/billing/actions";
import { logoutAction } from "@/app/auth/actions";
import { TopBar } from "@/components/layout/TopBar";

export default async function AccountPage() {
  const user = await verifySession();
  const sub = await getSubscription(user.id);
  const t = await getTranslations("account");

  const isTrial = sub?.status === "trialing";
  const plan = isTrial
    ? t("trialPlan")
    : sub?.plan_interval === "year"
    ? t("yearly")
    : t("monthly");
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("de-DE")
    : null;
  const periodEndLabel = isTrial
    ? t("trialEndsOn")
    : sub?.cancel_at_period_end
    ? t("endsOn")
    : t("renewsOn");

  return (
    <>
      <TopBar userEmail={user.email ?? null} />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <h2 className="font-medium">{t("subscription")}</h2>
          {sub ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("plan")}</dt>
              <dd>{plan}</dd>
              <dt className="text-muted-foreground">{t("status")}</dt>
              <dd className="capitalize">{sub.status}</dd>
              {periodEnd && (
                <>
                  <dt className="text-muted-foreground">{periodEndLabel}</dt>
                  <dd>{periodEnd}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noSubscription")}</p>
          )}

          {isTrial ? (
            // Trial users have no Stripe customer yet — send them to pricing to convert.
            <Link
              href={`/pricing`}
              className="inline-block rounded-lg bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {t("upgrade")}
            </Link>
          ) : (
            <form action={startPortalAction}>
              <button
                type="submit"
                className="rounded-lg bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                {t("managePortal")}
              </button>
            </form>
          )}
        </section>

        <section>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              {t("logout")}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
