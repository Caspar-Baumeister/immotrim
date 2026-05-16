import { getTranslations } from "next-intl/server";
import { verifySession, getSubscription } from "@/lib/dal";
import { startPortalAction } from "@/app/[locale]/billing/actions";
import { logoutAction } from "@/app/[locale]/auth/actions";
import { TopBar } from "@/components/layout/TopBar";

type Props = { params: Promise<{ locale: string }> };

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  const user = await verifySession(locale);
  const sub = await getSubscription(user.id);
  const t = await getTranslations("account");

  const plan = sub?.plan_interval === "year" ? t("yearly") : t("monthly");
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(locale)
    : null;

  return (
    <>
      <TopBar locale={locale} userEmail={user.email ?? null} />
      <main className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-medium">{t("subscription")}</h2>
          {sub ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("plan")}</dt>
              <dd>{plan}</dd>
              <dt className="text-muted-foreground">{t("status")}</dt>
              <dd className="capitalize">{sub.status}</dd>
              {periodEnd && (
                <>
                  <dt className="text-muted-foreground">
                    {sub.cancel_at_period_end ? t("endsOn") : t("renewsOn")}
                  </dt>
                  <dd>{periodEnd}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noSubscription")}</p>
          )}

          <form action={startPortalAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium px-4 py-2 transition-colors"
            >
              {t("managePortal")}
            </button>
          </form>
        </section>

        <section>
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
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
