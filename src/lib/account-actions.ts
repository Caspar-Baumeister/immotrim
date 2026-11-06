"use server";

import { verifySession } from "@/lib/dal";
import { setDisplayName } from "@/lib/data/users";

// Name shown on the bank overview.
export async function saveDisplayName(name: string): Promise<void> {
  const { uid } = await verifySession();
  await setDisplayName(uid, name.slice(0, 120));
}
