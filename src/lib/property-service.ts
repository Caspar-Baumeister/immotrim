"use server";

import { randomUUID } from "node:crypto";
import { verifySession, hasPlus, FREE_PROPERTY_LIMIT } from "@/lib/dal";
import { userRef } from "@/lib/data/users";
import { adminBucket } from "@/lib/firebase/admin";
import type { Property, PropertyInputs } from "@/lib/types";

// Server actions for the user's properties (users/{uid}/properties/{id}).
// Callable from client components; every call re-checks the session.

const col = (uid: string) => userRef(uid).collection("properties");

function toProperty(uid: string, id: string, d: FirebaseFirestore.DocumentData): Property {
  return {
    id,
    user_id: uid,
    name: d.name ?? "",
    address: d.address ?? null,
    inputs: d.inputs as PropertyInputs,
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

// JSON round trip drops undefined fields (Firestore rejects them nested) and
// anything that is not plain data.
const plain = (inputs: PropertyInputs) => JSON.parse(JSON.stringify(inputs)) as PropertyInputs;

export type CreateResult = { id: string } | { error: "plan_limit" };

export async function createProperty(
  name: string,
  address: string,
  inputs: PropertyInputs,
): Promise<CreateResult> {
  const { uid } = await verifySession();
  if (!(await hasPlus(uid))) {
    const count = (await col(uid).count().get()).data().count;
    if (count >= FREE_PROPERTY_LIMIT) return { error: "plan_limit" };
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  await col(uid).doc(id).set({
    name: name.trim(),
    address: address.trim() || null,
    inputs: plain(inputs),
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export async function updateProperty(
  id: string,
  name: string,
  address: string,
  inputs: PropertyInputs,
): Promise<void> {
  const { uid } = await verifySession();
  const ref = col(uid).doc(id);
  if (!(await ref.get()).exists) throw new Error("not_found");
  await ref.update({
    name: name.trim(),
    address: address.trim() || null,
    inputs: plain(inputs),
    updated_at: new Date().toISOString(),
  });
}

export async function getProperty(id: string): Promise<Property | null> {
  const { uid } = await verifySession();
  const snap = await col(uid).doc(id).get();
  return snap.exists ? toProperty(uid, snap.id, snap.data()!) : null;
}

export async function getAllProperties(): Promise<Property[]> {
  const { uid } = await verifySession();
  const q = await col(uid).orderBy("created_at", "desc").get();
  return q.docs.map((d) => toProperty(uid, d.id, d.data()));
}

// Deletes the property together with its documents and their files.
export async function deleteProperty(id: string): Promise<void> {
  const { uid } = await verifySession();
  const docs = await userRef(uid).collection("documents").where("property_id", "==", id).get();
  const bucket = adminBucket();
  await Promise.all(
    docs.docs.map(async (d) => {
      await bucket.file(d.get("file_path")).delete({ ignoreNotFound: true }).catch(() => {});
      await d.ref.delete();
    }),
  );
  await col(uid).doc(id).delete();
}

// Used by the new-property form to group uploads before the property exists.
export async function newDraftId(): Promise<string> {
  return randomUUID();
}
