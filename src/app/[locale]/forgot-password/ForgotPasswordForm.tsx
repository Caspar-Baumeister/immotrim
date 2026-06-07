"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestPasswordResetAction, type AuthFormState } from "../auth/actions";

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(requestPasswordResetAction, undefined);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
        <p className="text-sm font-medium">{t("resetSentTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("resetSentDesc")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">{t("email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-amber-500/60"
        />
        {state?.fieldErrors?.email?.map((e) => (
          <p key={e} className="text-xs text-destructive">{e}</p>
        ))}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black text-sm font-semibold px-4 py-2.5 transition-colors"
      >
        {pending ? t("submitting") : t("submitForgot")}
      </button>
    </form>
  );
}
