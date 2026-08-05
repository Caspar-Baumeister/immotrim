"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePasswordAction, type AuthFormState } from "../auth/actions";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(updatePasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">{t("newPassword")}</label>
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
        {pending ? t("submitting") : t("submitReset")}
      </button>
    </form>
  );
}
