// One-off move from Supabase to Firebase (2026-11 relaunch).
//
// Reads the JSON exports (supabase db query --read-only -o json …) and the
// downloaded property documents from EXPORT_DIR and writes them to Firebase:
//   - Auth users with their Supabase UUID as uid (Stripe metadata keeps working),
//     bcrypt password hashes (passwords stay valid) and Google identities.
//   - users/{uid}: email, display name, subscription.
//   - users/{uid}/properties/{id} and users/{uid}/documents/{id} + Storage files.
// Only property documents move; Selbstauskunft and wishlist data (personal
// documents, IBAN, birth dates) are left behind on purpose.
//
// Idempotent: run it again right before going live to pick up the latest state.
//
// Emulators: FIRESTORE_EMULATOR_HOST=… FIREBASE_AUTH_EMULATOR_HOST=…
//            FIREBASE_STORAGE_EMULATOR_HOST=… node scripts/migrate-from-supabase.mjs <dir>
// Live:      FIREBASE_SERVICE_ACCOUNT=<path to key.json> node scripts/migrate-from-supabase.mjs <dir>

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/migrate-from-supabase.mjs <export dir>");
const rows = (name) => JSON.parse(readFileSync(path.join(dir, `${name}.json`), "utf8")).rows;

const projectId = "immo-2d39f";
const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
initializeApp({
  projectId,
  storageBucket: `${projectId}.firebasestorage.app`,
  ...(keyPath ? { credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) } : {}),
});
const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const bucket = getStorage().bucket();

const users = rows("users");
const identities = rows("identities");
const properties = rows("properties");
const documents = rows("documents").filter((d) => d.property_id);
const subscriptions = rows("subscriptions");
const profiles = rows("profiles");

// ── Auth ────────────────────────────────────────────────────────────────────
const records = users.map((u) => {
  const google = identities.find((i) => i.user_id === u.id && i.provider === "google");
  const meta = u.raw_user_meta_data ?? {};
  const rec = {
    uid: u.id,
    email: u.email,
    emailVerified: Boolean(u.email_confirmed_at),
    displayName: meta.full_name || meta.name || undefined,
    metadata: {
      creationTime: new Date(u.created_at).toUTCString(),
      ...(u.last_sign_in_at ? { lastSignInTime: new Date(u.last_sign_in_at).toUTCString() } : {}),
    },
    providerData: [],
  };
  if (u.encrypted_password) rec.passwordHash = Buffer.from(u.encrypted_password);
  if (google) {
    rec.providerData.push({
      uid: google.provider_id,
      providerId: "google.com",
      email: google.identity_data?.email ?? u.email,
      displayName: rec.displayName,
    });
  }
  return rec;
});

// importUsers overwrites existing records with the same uid, so re-runs are safe.
const result = await auth.importUsers(records, { hash: { algorithm: "BCRYPT" } });
console.log(`auth: ${result.successCount} imported, ${result.failureCount} failed`);
for (const e of result.errors) console.log("  ", records[e.index].email, e.error.message);

// ── Account docs ────────────────────────────────────────────────────────────
for (const u of users) {
  const sub = subscriptions.find((s) => s.user_id === u.id);
  const profile = profiles.find((p) => p.user_id === u.id);
  const st = profile?.stammdaten ?? {};
  const name = [st.vorname, st.nachname].filter(Boolean).join(" ").trim();
  await db.collection("users").doc(u.id).set(
    {
      email: u.email,
      createdAt: u.created_at,
      ...(name ? { displayName: name } : {}),
      subscription: sub
        ? {
            status: sub.status,
            stripe_customer_id: sub.stripe_customer_id ?? null,
            stripe_subscription_id: sub.stripe_subscription_id ?? null,
            price_id: sub.price_id ?? null,
            plan_interval: sub.plan_interval ?? null,
            current_period_end: sub.current_period_end ?? null,
            cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            updated_at: sub.updated_at ?? new Date().toISOString(),
          }
        : null,
    },
    { merge: true },
  );
}
console.log(`users: ${users.length} account docs`);

// ── Properties ──────────────────────────────────────────────────────────────
for (const p of properties) {
  const { selbstauskunft: _drop, ...inputs } = p.inputs ?? {};
  await db.collection("users").doc(p.user_id).collection("properties").doc(p.id).set({
    name: p.name ?? "",
    address: p.address ?? null,
    inputs: JSON.parse(JSON.stringify(inputs)),
    created_at: p.created_at,
    updated_at: p.updated_at ?? p.created_at,
  });
}
console.log(`properties: ${properties.length}`);

// ── Documents ───────────────────────────────────────────────────────────────
const safeName = (n) => n.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
let moved = 0;
for (const d of documents) {
  const local = path.join(dir, "files", d.file_path);
  if (!existsSync(local)) {
    console.log("  missing file, skipped:", d.file_name);
    continue;
  }
  const dest = `users/${d.user_id}/documents/${d.id}/${safeName(d.file_name)}`;
  await bucket.file(dest).save(readFileSync(local), {
    contentType: d.mime_type || "application/octet-stream",
    resumable: false,
  });
  await db.collection("users").doc(d.user_id).collection("documents").doc(d.id).set({
    property_id: d.property_id,
    draft_id: null,
    doc_type: d.doc_type ?? null,
    file_name: d.file_name,
    file_path: dest,
    mime_type: d.mime_type ?? null,
    size_bytes: d.size_bytes ?? null,
    created_at: d.created_at,
  });
  moved++;
}
console.log(`documents: ${moved} of ${documents.length}`);
