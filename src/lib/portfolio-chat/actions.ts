"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Json, PropertyInputs } from "@/lib/supabase/types";
import {
  getFieldDef,
  validateFieldValue,
  applyFieldChange,
  readFieldValue,
} from "./fields";

export type ApplyResult =
  | { ok: true; field: string; oldValue: number | undefined; newValue: number }
  | { ok: false; error: "auth" | "not_found" | "invalid_field" | "invalid_value" | "write_failed" };

// The trusted write path for assistant-proposed changes. The model never reaches
// this — only the user's explicit "Apply" click does. We re-authenticate,
// re-fetch the property (RLS makes cross-user writes impossible), re-validate the
// field against the whitelist and the value against its range, then apply an
// immutable, single-field deep-set. Any AI-provided "old value" is ignored; we
// re-derive state from the database.
export async function applyPortfolioChange(input: {
  propertyId: string;
  field: string;
  newValue: number;
}): Promise<ApplyResult> {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const def = getFieldDef(input.field);
  if (!def) return { ok: false, error: "invalid_field" };

  const value = validateFieldValue(def, input.newValue);
  if (value === null) return { ok: false, error: "invalid_value" };

  const { data: row } = await sb
    .from("properties")
    .select("id, name, address, inputs")
    .eq("id", input.propertyId)
    .single();
  if (!row) return { ok: false, error: "not_found" };

  const inputs = row.inputs as unknown as PropertyInputs;
  const oldValue = readFieldValue(inputs, def);
  const nextInputs = applyFieldChange(inputs, def, value);

  const { error } = await sb
    .from("properties")
    .update({ inputs: nextInputs as unknown as Json, updated_at: new Date().toISOString() })
    .eq("id", input.propertyId);
  if (error) return { ok: false, error: "write_failed" };

  return { ok: true, field: def.id, oldValue, newValue: value };
}
