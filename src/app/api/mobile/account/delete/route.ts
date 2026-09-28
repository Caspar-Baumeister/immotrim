import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// iPhone app: delete the signed-in user's account (App Store requirement).
// Bearer-token auth identifies the user; everything else runs with the
// service-role client because the auth user itself can only be removed by an
// admin call. Order: storage objects, table rows, then the auth user (the FK
// cascades would remove the rows anyway; explicit deletes keep the sequence
// observable in logs and remove data even if a cascade is ever dropped).

const BUCKET = "property-documents";
const REMOVE_CHUNK = 100;

type Admin = ReturnType<typeof getSupabaseAdmin>;

// Storage objects are keyed "<uid>/<group>/<file>"; list() is one level deep
// and marks folders with a null id, so recurse into every folder entry.
async function listAllObjects(admin: Admin, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) {
    console.error(`[account delete] list ${prefix}:`, error.message);
    return out;
  }
  for (const entry of data ?? []) {
    if (!entry.name) continue;
    const path = `${prefix}/${entry.name}`;
    if (!entry.id) {
      out.push(...(await listAllObjects(admin, path)));
    } else {
      out.push(path);
    }
  }
  return out;
}

async function removeStorage(admin: Admin, uid: string): Promise<number> {
  const paths = await listAllObjects(admin, uid);
  for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
    const chunk = paths.slice(i, i + REMOVE_CHUNK);
    const { error } = await admin.storage.from(BUCKET).remove(chunk);
    if (error) console.error("[account delete] storage remove:", error.message);
  }
  return paths.length;
}

async function deleteRows(
  label: string,
  query: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await query;
  if (error) console.error(`[account delete] ${label}:`, error.message);
}

export async function POST(request: Request) {
  const { user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const uid = user.id;
  const admin = getSupabaseAdmin();

  try {
    const removedObjects = await removeStorage(admin, uid);

    await deleteRows("properties", admin.from("properties").delete().eq("user_id", uid));
    await deleteRows("documents", admin.from("documents").delete().eq("user_id", uid));
    await deleteRows("report_images", admin.from("report_images").delete().eq("user_id", uid));
    await deleteRows("profiles", admin.from("profiles").delete().eq("user_id", uid));
    await deleteRows("subscriptions", admin.from("subscriptions").delete().eq("user_id", uid));
    await deleteRows(
      "wishlist_properties",
      admin.from("wishlist_properties").delete().eq("user_id", uid),
    );
    await deleteRows("concept_objects", admin.from("concept_objects").delete().eq("user_id", uid));
    await deleteRows(
      "portfolio_shares",
      admin.from("portfolio_shares").delete().eq("user_id", uid),
    );

    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) {
      console.error("[account delete] deleteUser:", error.message);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    console.info(`[account delete] user ${uid} removed (${removedObjects} storage objects)`);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[account delete] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
