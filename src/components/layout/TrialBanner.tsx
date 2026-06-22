import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Whole days remaining until the trial's period end, rounded up (never negative).
function daysLeft(currentPeriodEnd: string): number {
  const msLeft = new Date(currentPeriodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

// Thin banner shown across the app while a user is on the free trial. Renders
// nothing for paid subscribers. Days left is rounded up from current_period_end.
export async function TrialBanner({
  locale,
  status,
  currentPeriodEnd,
}: {
  locale: string;
  status: string;
  currentPeriodEnd: string | null;
}) {
  if (status !== "trialing" || !currentPeriodEnd) return null;

  const days = daysLeft(currentPeriodEnd);
  const t = await getTranslations("trial");

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300">
      <span>{t("banner", { days })}</span>
      <Link
        href={`/${locale}/pricing`}
        className="font-medium underline underline-offset-2 hover:text-amber-500"
      >
        {t("upgrade")}
      </Link>
    </div>
  );
}
