import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { startCheckoutAction } from "@/app/[locale]/billing/actions";
import { getStripe } from "@/lib/stripe";

type Props = { locale: string };

async function fetchPriceAmount(priceId: string): Promise<string> {
  try {
    const price = await getStripe().prices.retrieve(priceId);
    if (price.unit_amount == null) return "";
    const amount = price.unit_amount / 100;
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: (price.currency ?? "eur").toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return "";
  }
}

export async function PricingCards({ locale }: Props) {
  const t = await getTranslations("landing.pricing");
  const [monthlyAmount, yearlyAmount, lifetimeAmount] = await Promise.all([
    fetchPriceAmount(process.env.STRIPE_PRICE_MONTHLY!),
    fetchPriceAmount(process.env.STRIPE_PRICE_YEARLY!),
    fetchPriceAmount(process.env.STRIPE_PRICE_LIFETIME!),
  ]);

  const features = [t("f1"), t("f2"), t("f3"), t("f4"), t("f5")];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
      <PlanCard
        title={t("monthly")}
        amount={monthlyAmount}
        per={t("perMonth")}
        desc={t("monthlyDesc")}
        ctaLabel={t("cta")}
        plan="monthly"
        locale={locale}
        features={features}
        includesLabel={t("includes")}
      />
      <PlanCard
        title={t("yearly")}
        amount={yearlyAmount}
        per={t("perYear")}
        desc={t("yearlyDesc")}
        ctaLabel={t("cta")}
        plan="yearly"
        locale={locale}
        features={features}
        includesLabel={t("includes")}
      />
      <PlanCard
        title={t("lifetime")}
        amount={lifetimeAmount}
        per={t("perOnce")}
        desc={t("lifetimeDesc")}
        ctaLabel={t("lifetimeCta")}
        plan="lifetime"
        locale={locale}
        features={features}
        includesLabel={t("includes")}
        badge={t("lifetimeBadge")}
        highlight
      />
    </div>
  );
}

function PlanCard({
  title,
  amount,
  per,
  desc,
  ctaLabel,
  plan,
  locale,
  features,
  includesLabel,
  badge,
  highlight = false,
}: {
  title: string;
  amount: string;
  per: string;
  desc: string;
  ctaLabel: string;
  plan: "monthly" | "yearly" | "lifetime";
  locale: string;
  features: string[];
  includesLabel: string;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border bg-card p-6 flex flex-col gap-5 ${
        highlight ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-border"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-black">
          {badge}
        </span>
      )}
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums">{amount}</span>
        <span className="text-sm text-muted-foreground">{per}</span>
      </div>

      <form action={startCheckoutAction}>
        <input type="hidden" name="plan" value={plan} />
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className={`w-full rounded-lg text-sm font-semibold px-4 py-2.5 transition-colors ${
            highlight
              ? "bg-amber-500 hover:bg-amber-400 text-black"
              : "bg-foreground/10 hover:bg-foreground/15 text-foreground"
          }`}
        >
          {ctaLabel}
        </button>
      </form>

      <div className="space-y-2 pt-1">
        <p className="text-xs text-muted-foreground">{includesLabel}</p>
        <ul className="space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
