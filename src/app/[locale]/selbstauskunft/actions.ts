"use server";

import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { grantTrialIfNew } from "@/lib/trial";

const schema = z.object({
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

export type ConvertState =
  | {
      error?: string;
      success?: boolean;
      emailExists?: boolean;
      fieldErrors?: { email?: string[]; password?: string[] };
    }
  | undefined;

// Upgrades the current ANONYMOUS session into a permanent email/password account.
// Because the user_id is preserved, every document + property created during the
// funnel stays owned by the now-permanent user — no data migration required.
// Also grants the 14-day trial so the saved portfolio is immediately accessible.
export async function convertAnonymousAccountAction(
  _prev: ConvertState,
  formData: FormData
): Promise<ConvertState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { error: "Sitzung abgelaufen. Bitte lade die Seite neu und versuche es erneut." };
  }

  const { error } = await sb.auth.updateUser({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Most common cause: the email already belongs to another account. We can't
    // silently merge anonymous data into it (that needs an explicit, audited
    // migration), so we ask the user to use a different email or sign in.
    const exists = /registered|already|exist/i.test(error.message);
    return {
      error: exists
        ? "Diese E-Mail ist bereits registriert. Bitte melde dich mit deinem bestehenden Konto an oder nutze eine andere E-Mail."
        : error.message,
      emailExists: exists,
    };
  }

  await grantTrialIfNew(user.id);
  return { success: true };
}
