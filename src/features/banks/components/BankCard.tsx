"use client";

import Link from "next/link";
import {
  Building2,
  Download,
  ExternalLink,
  Handshake,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompletionBar } from "@/components/shared/CompletionBar";
import { hasBankDocument, type Bank } from "../registry";
import { useSelbstauskunftDownload } from "../hooks/useSelbstauskunftDownload";
import {
  ANFRAGE_STATUSES,
  ANFRAGE_STATUS_LABELS,
  type AnfrageStatus,
} from "@/features/anfrage/request-service";

// A card for one bank/Vermittler: per-bank document completeness + financing-fit
// score for the SELECTED concept, what's still missing, contact channel, outreach
// status — and the CTA into the compiled Finanzierungsanfrage.
export function BankCard({
  bank,
  completeness,
  score,
  missing,
  conceptId,
  objectId,
  status,
  onStatusChange,
}: {
  bank: Bank;
  /** 0–100 document completeness for THIS bank (and the selected concept). */
  completeness: number;
  /** 0–100 rule-based financing fit score (estimate). */
  score: number;
  /** Human labels of what's still missing for this bank. */
  missing: string[];
  /** Selected concept — without one the Anfrage CTA is disabled. */
  conceptId?: string;
  /** Selected concept object — carried into the Anfrage and the PDF. */
  objectId?: string;
  /** Outreach status of (concept, bank), if any. */
  status?: AnfrageStatus;
  onStatusChange?: (status: AnfrageStatus) => void;
}) {
  const { busy, error, download } = useSelbstauskunftDownload(bank.id, {
    fileName: `Selbstauskunft-${bank.shortName}.pdf`,
    conceptId,
    objectId,
  });

  const scoreColor =
    score >= 67 ? "#10b981" : score >= 34 ? "#f59e0b" : "#ef4444";
  const shownMissing = missing.slice(0, 4);
  const moreMissing = missing.length - shownMissing.length;
  const Icon = bank.kind === "vermittler" ? Handshake : Building2;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/15 transition-colors flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-[#6c5ce7]" />
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
            <span className="text-muted-foreground">Unterlagen für diese Bank</span>
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
            <span className="text-foreground">
              {shownMissing.join(", ")}
              {moreMissing > 0 ? ` +${moreMissing} weitere` : ""}
            </span>
          </p>
        ) : (
          <p className="text-xs text-emerald-500">
            Alle Unterlagen vollständig — bereit für die Anfrage.
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
          {bank.email ? (
            <a
              href={`mailto:${bank.email}`}
              className="inline-flex items-center gap-1 text-[#6c5ce7] hover:underline"
            >
              <Mail className="h-3 w-3" /> {bank.email}
            </a>
          ) : bank.contactUrl ? (
            <a
              href={bank.contactUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[#6c5ce7] hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Kontaktformular
            </a>
          ) : null}
        </div>

        {/* Outreach status for the selected concept */}
        {conceptId && onStatusChange && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Status:</span>
            <select
              value={status ?? "entwurf"}
              onChange={(e) => onStatusChange(e.target.value as AnfrageStatus)}
              className="h-7 rounded-md border border-input bg-transparent px-1.5 text-[11px] text-foreground outline-none"
            >
              {ANFRAGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ANFRAGE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="px-5 pb-4 mt-auto space-y-2">
        {conceptId ? (
          <Link
            href={`/konzepte/${conceptId}/anfrage/${bank.id}${objectId ? `?objekt=${objectId}` : ""}`}
            className="block"
          >
            <Button
              size="sm"
              className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Finanzierungsanfrage erstellen
            </Button>
          </Link>
        ) : (
          <Button size="sm" disabled className="w-full font-semibold gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Finanzierungsanfrage erstellen
          </Button>
        )}
        {hasBankDocument(bank.id) && (
          <Button
            size="sm"
            variant="outline"
            onClick={download}
            disabled={busy}
            className="w-full gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Selbstauskunft (PDF)
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {!conceptId && (
          <p className="text-xs text-muted-foreground">
            <Link href="/konzepte/new" className="text-[#6c5ce7] hover:underline">
              Lege zuerst ein Konzept an
            </Link>
            , um eine Anfrage zu erstellen.
          </p>
        )}
      </div>
    </div>
  );
}
