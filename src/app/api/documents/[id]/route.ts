import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/session";
import { userRef } from "@/lib/data/users";
import { adminBucket } from "@/lib/firebase/admin";

export const runtime = "nodejs";

// Streams one of the caller's documents.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const snap = await userRef(user.uid).collection("documents").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const file = adminBucket().file(snap.get("file_path") as string);
  const [exists] = await file.exists();
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [buffer] = await file.download();
  const name = (snap.get("file_name") as string) || "dokument";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": (snap.get("mime_type") as string) || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
