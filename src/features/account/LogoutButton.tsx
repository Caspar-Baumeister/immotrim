"use client";

import { endSession } from "@/lib/firebase/client";

export function LogoutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await endSession();
        window.location.assign("/");
      }}
      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
    >
      {label}
    </button>
  );
}
