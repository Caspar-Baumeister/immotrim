import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

// Lets the browser SDK sign in as the session's user (needed for Storage
// uploads) when its own sign-in state is gone.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = await adminAuth().createCustomToken(user.uid);
  return NextResponse.json({ token });
}
