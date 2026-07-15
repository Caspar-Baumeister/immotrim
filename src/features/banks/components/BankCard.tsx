"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Download,
  Loader2,
  Mail,
  Upload,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompletionBar } from "@/components/shared/CompletionBar";
import type { Bank } from "../registry";

// A dashboard card for one bank: shows document completeness + a financing-fit
// score, what's still missing, the bank's conditions/contact, and lets the user
// generate a Selbstauskunft (general, or for a concrete object via an Exposé).
export function BankCard({
  bank,
  completeness,
  score,
  missing,
  disabled,
}: {
  bank: Bank;
  /** 0–100 document/data completeness for this bank. */
  completeness: number;
  /** 0–100 rule-based financing fit score (estimate). */
  score: number;
  /** Human labels of what's still missing. */
  missing: string[];
  /** No properties yet — nothing to fill the form with. */
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/selbstauskunft/${bank.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
      a.download = `Selbstauskunft-${bank.shortName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erstellung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  const scoreColor =
    score >= 67 ? "#10b981" : score >= 34 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/15 transition-colors flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-[#6c5ce7]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {bank.shortName}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{bank.name}</p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Score
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: scoreColor }}
          >
            {Math.round(score)}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3 flex-1">
        {/* Completeness */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Vollständigkeit</span>
            <span className="tabular-nums font-medium text-foreground">
              {Math.round(completeness)}%
            </span>
          </div>
          <CompletionBar value={completeness} height="h-2" />
        </div>

        {/* Missing / ready */}
        {missing.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Noch offen:{" "}
            <span className="text-foreground">{missing.join(", ")}</span>
          </p>
        ) : (
          <p className="text-xs text-emerald-500">
            Alle Unterlagen vollständig — bereit für die Selbstauskunft.
          </p>
        )}

        {/* Conditions + contact */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
          {bank.conditions?.zinsAb != null && (
            <span>
              Zins ab{" "}
              <span className="text-foreground font-medium">
                {bank.conditions.zinsAb.toLocaleString("de-DE")}%
              </span>
            </span>
          )}
          {bank.conditions?.maxLtv != null && (
            <span>
              Max. Beleihung{" "}
              <span className="text-foreground font-medium">
                {bank.conditions.maxLtv}%
              </span>
            </span>
          )}
          {bank.email && (
            <a
              href={`mailto:${bank.email}`}
              className="inline-flex items-center gap-1 text-[#6c5ce7] hover:underline"
            >
              <Mail className="h-3 w-3" /> {bank.email}
            </a>
          )}
        </div>
      </div>

      <div className="px-5 pb-4 mt-auto space-y-2">
        {!choosing ? (
          <Button
            size="sm"
            onClick={() => setChoosing(true)}
            disabled={disabled}
            className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Selbstauskunft erstellen
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setChoosing(false)}
              className="self-start text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3 w-3" /> zurück
            </button>
            <Button
              size="sm"
              onClick={download}
              disabled={busy}
              className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Allgemeine Selbstauskunft
            </Button>
            <Link href="/wishlist/new" className="block">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Für ein Objekt (Exposé hochladen)
              </Button>
            </Link>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {disabled && (
          <p className="text-xs text-muted-foreground">
            Füge zuerst eine Immobilie hinzu.
          </p>
        )}
      </div>
    </div>
  );
}
