"use client";

import { useCallback, useState } from "react";

// Shared client flow for generating + downloading a Selbstauskunft PDF from
// POST /api/selbstauskunft/[bankId] — used by the bank cards (bank-specific
// forms) and by Dashboard/Checkliste (the generic "immotrim" document).
// A 402 means the user has no paid plan: surface the message and send them to
// pricing, mirroring the Portfolio-Report gate.
export function useSelbstauskunftDownload(
  bankId: string,
  opts?: { fileName?: string; objectId?: string },
): { busy: boolean; error: string | null; download: () => Promise<void> } {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fileName, objectId } = opts ?? {};

  const download = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/selbstauskunft/${bankId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(objectId ? { objectId } : {}),
      });
      if (res.status === 402) {
        setError("Bezahlter Tarif nötig. Weiterleitung …");
        window.location.assign(`/pricing`);
        return;
      }
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName ?? "Selbstauskunft-Immotrim.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erstellung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }, [bankId, objectId, fileName]);

  return { busy, error, download };
}
