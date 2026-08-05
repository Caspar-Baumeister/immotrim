"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signupAction, type AuthFormState } from "../auth/actions";

export function SignupForm({ plan }: { plan: "monthly" | "yearly" }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signupAction, undefined);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
        <p className="text-sm font-medium">{t("checkEmailTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("checkEmailDesc")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="plan" value={plan} />

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">{t("email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-[#6c5ce7]/60"
        />
        {state?.fieldErrors?.email?.map((e) => (
          <p key={e} className="text-xs text-destructive">{e}</p>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">{t("password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm outline-none focus:border-[#6c5ce7]/60"
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
        {state?.fieldErrors?.password?.map((e) => (
          <p key={e} className="text-xs text-destructive">{e}</p>
        ))}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#6c5ce7] hover:bg-[#5b4bd6] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
      >
        {pending ? t("submitting") : t("submitSignup")}
      </button>
    </form>
  );
}
