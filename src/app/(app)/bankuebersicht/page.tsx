"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2, Sparkles } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useAccount } from "@/features/account/account-context";

// Preview of the bank overview (same HTML as the PDF) with the download.
export default function BankOverviewPage() {
  const { plus } = useAccount();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/bank-overview?pdf=1");
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Immotrim-Portfoliouebersicht-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Das PDF konnte nicht erstellt werden. Bitte versuche es noch einmal.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Bankenübersicht" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold text-foreground">Dein Portfolio auf einer Seite</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Werte, Restschulden, Mieten, Raten und Beleihungsauslauf je Objekt, so wie es heute steht.
              Ohne Prognosen, damit die Bank jede Zahl mit deinen Unterlagen abgleichen kann.
              Objektdetails wie Wohnfläche, Baujahr und Marktwert ergänzt du in den Objekten.
            </p>
          </div>
          {plus ? (
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-[#6c5ce7] hover:bg-[#5b4bd6] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Als PDF herunterladen
            </button>
          ) : (
            <Link
              href="/pricing?reason=bank"
              className="inline-flex items-center gap-2 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              PDF mit Plus herunterladen
            </Link>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex-1 min-h-[640px] rounded-xl border border-border bg-white overflow-hidden">
          <iframe
            src="/api/bank-overview"
            title="Vorschau Bankenübersicht"
            className="w-full h-full min-h-[640px]"
          />
        </div>
      </div>
    </div>
  );
}
