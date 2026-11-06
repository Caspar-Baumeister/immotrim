"use client";

import { useState } from "react";
import { clientAuth } from "@/lib/firebase/client";

// Two-step delete so it can't happen by accident.
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      setBusy(false);
      setError(
        res.status === 502
          ? "Dein Abo konnte nicht gekündigt werden, deshalb wurde nichts gelöscht. Bitte versuche es später noch einmal."
          : "Das hat nicht geklappt. Bitte versuche es noch einmal.",
      );
      return;
    }
    await clientAuth().signOut().catch(() => {});
    window.location.assign("/");
  };

  return (
    <section className="rounded-xl border border-destructive/30 bg-card p-4 sm:p-6 space-y-3">
      <h2 className="font-medium">Konto löschen</h2>
      <p className="text-sm text-muted-foreground">
        Löscht alle Immobilien, Dokumente und deinen Zugang unwiderruflich. Ein laufendes
        Abo wird sofort gekündigt.
      </p>
      {confirming ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-lg bg-destructive text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {busy ? "Wird gelöscht…" : "Ja, Konto endgültig löschen"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-lg border border-border text-sm px-4 py-2 hover:bg-accent"
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-destructive/40 text-destructive text-sm font-medium px-4 py-2 hover:bg-destructive/5"
        >
          Konto löschen
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
