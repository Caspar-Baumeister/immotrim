"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, X } from "lucide-react";
import {
  convertAnonymousAccountAction,
  type ConvertState,
} from "@/app/[locale]/selbstauskunft/actions";

type Props = {
  locale: string;
  /** "save" → land in portfolio; "create" → must pick a paid plan next. */
  mode: "save" | "create";
  onCancel: () => void;
};

export function ConversionForm({ locale, mode, onCancel }: Props) {
  const t = useTranslations("selbstauskunft.conv");
  const [state, formAction, pending] = useActionState<ConvertState, FormData>(
    convertAnonymousAccountAction,
    undefined,
  );

  const success = state?.success === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="font-heading text-xl font-semibold">
            {success ? t("successTitle") : t("title")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("cancel")}
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          mode === "save" ? (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                {t("successDesc")}
              </p>
              <Link
                href={`/${locale}/portfolio`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition-colors"
              >
                {t("goPortfolio")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            // "create" path: account is saved but the report needs a paid plan.
            <div className="space-y-4">
              <p className="text-sm font-medium">{t("paidTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("paidDesc")}</p>
              <Link
                href={`/${locale}/pricing`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition-colors"
              >
                {t("goPricing")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )
        ) : (
          <form action={formAction} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

            <div className="space-y-1.5">
              <label htmlFor="sa-email" className="block text-sm font-medium">
                {t("email")}
              </label>
              <input
                id="sa-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-amber-500/60"
              />
              {state?.fieldErrors?.email?.map((e) => (
                <p key={e} className="text-xs text-destructive">{e}</p>
              ))}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sa-password" className="block text-sm font-medium">
                {t("password")}
              </label>
              <input
                id="sa-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-amber-500/60"
              />
              <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
              {state?.fieldErrors?.password?.map((e) => (
                <p key={e} className="text-xs text-destructive">{e}</p>
              ))}
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
