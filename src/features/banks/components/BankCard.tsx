"use client";

import Link from "next/link";
import {
  Building2,
  Download,
  ExternalLink,
  Handshake,
  Info,
  Loader2,
  Mail,
  Phone,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  hasBankDocument,
  type Bank,
  type BankFinanzierungsInfo,
} from "../registry";
import { useSelbstauskunftDownload } from "../hooks/useSelbstauskunftDownload";
import {
  ANFRAGE_STATUSES,
  ANFRAGE_STATUS_LABELS,
  type AnfrageStatus,
} from "@/features/anfrage/request-service";

const nf = new Intl.NumberFormat("de-DE");

const KAPITALANLAGE_DISPLAY: Record<
  BankFinanzierungsInfo["kapitalanlage"],
  { label: string; className: string }
> = {
  ja: { label: "wird finanziert", className: "text-emerald-500" },
  unklar: { label: "nicht publiziert — vorab klären", className: "text-orange-400" },
  nein: { label: "wird nicht finanziert", className: "text-red-400" },
};

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

// "Was finanziert diese Bank?" as a popover: the lending criteria open OVER the
// grid instead of inline, so expanding one card never resizes its neighbours.
function FinanzierungsInfoPopover({ info }: { info: BankFinanzierungsInfo }) {
  const kap = KAPITALANLAGE_DISPLAY[info.kapitalanlage];
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground w-fit cursor-pointer">
        <Info className="h-3 w-3" />
        Was finanziert diese Bank?
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-h-96 overflow-auto">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 text-[11px]">
            <span className="text-muted-foreground w-32 shrink-0">Kapitalanlage</span>
            <span className={kap.className}>{kap.label}</span>
          </div>
          {info.kapitalanlageHinweis && (
            <p className="text-[11px] text-muted-foreground">
              {info.kapitalanlageHinweis}
            </p>
          )}
          <InfoRow label="Mietanrechnung" value={info.mietanrechnung} />
          <InfoRow label="EK Kapitalanlage" value={info.ekKapitalanlage} />
          <InfoRow label="Mikroapartments" value={info.mikroapartments} />
          <InfoRow
            label="Mindestfläche"
            value={info.minObjektflaeche ? `${info.minObjektflaeche} m²` : undefined}
          />
          <InfoRow label="Region" value={info.region} />
          <InfoRow
            label="Darlehen"
            value={
              info.minDarlehen || info.maxDarlehen
                ? [
                    info.minDarlehen ? `ab ${nf.format(info.minDarlehen)} €` : null,
                    info.maxDarlehen ? `bis ${nf.format(info.maxDarlehen)} €` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")
                : undefined
            }
          />
          <InfoRow label="Max. Beleihung" value={info.maxBeleihung} />
          <InfoRow label="Bereitstellungsfrei" value={info.bereitstellungszinsfrei} />
          <InfoRow label="Zinsbindungen" value={info.zinsbindungen} />
          <InfoRow label="Selbständige" value={info.selbststaendige} />
          {info.besonderheiten && info.besonderheiten.length > 0 && (
            <ul className="flex flex-col gap-0.5 pt-1">
              {info.besonderheiten.map((b) => (
                <li key={b} className="text-[11px] text-muted-foreground">
                  • {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Icon-only contact link (mailto/tel/contact form) — the label lives in `title`
// so long addresses don't blow up the card.
function ContactIcon({
  href,
  title,
  external,
  children,
}: {
  href: string;
  title: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      title={title}
      aria-label={title}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-[#6c5ce7] hover:border-[#6c5ce7]/40 hover:bg-[#6c5ce7]/5 transition-colors"
    >
      {children}
    </a>
  );
}

// A card for one bank/Vermittler: financing-fit score for the SELECTED concept,
// key conditions, contact channel, outreach status — and the CTA into the
// compiled Finanzierungsanfrage. Deliberately compact and uniform: details live
// in the popover, so every card keeps the same height.
export function BankCard({
  bank,
  score,
  conceptId,
  objectId,
  status,
  onStatusChange,
}: {
  bank: Bank;
  /** 0–100 rule-based financing fit score (estimate). */
  score: number;
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
  const Icon = bank.kind === "vermittler" ? Handshake : Building2;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 shadow-xs hover:shadow-md hover:border-foreground/20 transition-all">
      {/* Header: identity + score badge */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-[#6c5ce7]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {bank.shortName}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{bank.name}</p>
        </div>
        <span
          className="shrink-0 inline-flex items-baseline gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
          style={{ color: scoreColor, backgroundColor: `${scoreColor}1a` }}
          title="Finanzierungs-Fit (Schätzung)"
        >
          <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">
            Score
          </span>
          {Math.round(score)}
        </span>
      </div>

      {/* Key conditions + details popover */}
      <div className="flex flex-col gap-1.5">
        {(bank.conditions?.zinsAb != null || bank.conditions?.maxLtv != null) && (
          <p className="text-xs text-muted-foreground">
            {bank.conditions?.zinsAb != null && (
              <>
                Zins ab{" "}
                <span className="text-foreground font-medium">
                  {bank.conditions.zinsAb.toLocaleString("de-DE")}%
                </span>
              </>
            )}
            {bank.conditions?.zinsAb != null && bank.conditions?.maxLtv != null && (
              <span className="mx-1.5">·</span>
            )}
            {bank.conditions?.maxLtv != null && (
              <>
                Max. Beleihung{" "}
                <span className="text-foreground font-medium">
                  {bank.conditions.maxLtv}%
                </span>
              </>
            )}
          </p>
        )}
        {bank.ansprechpartner && (
          <p className="text-[11px] text-muted-foreground truncate">
            Ansprechperson:{" "}
            <span className="text-foreground">{bank.ansprechpartner.name}</span>
            {bank.ansprechpartner.rolle ? ` (${bank.ansprechpartner.rolle})` : ""}
          </p>
        )}
        {bank.finanzierungsInfo && (
          <FinanzierungsInfoPopover info={bank.finanzierungsInfo} />
        )}
      </div>

      {/* Bottom: status + contacts, then the CTA row */}
      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {conceptId && onStatusChange ? (
            <select
              value={status ?? "entwurf"}
              onChange={(e) => onStatusChange(e.target.value as AnfrageStatus)}
              aria-label="Anfrage-Status"
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-[11px] text-foreground outline-none"
            >
              {ANFRAGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ANFRAGE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            {bank.email && (
              <ContactIcon href={`mailto:${bank.email}`} title={bank.email}>
                <Mail className="h-3.5 w-3.5" />
              </ContactIcon>
            )}
            {bank.telefon && (
              <ContactIcon
                href={`tel:${bank.telefon.replace(/[^+\d]/g, "")}`}
                title={bank.telefon}
              >
                <Phone className="h-3.5 w-3.5" />
              </ContactIcon>
            )}
            {!bank.email && bank.contactUrl && (
              <ContactIcon href={bank.contactUrl} title="Kontaktformular" external>
                <ExternalLink className="h-3.5 w-3.5" />
              </ContactIcon>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {conceptId ? (
            <Link
              href={`/konzepte/${conceptId}/anfrage/${bank.id}${objectId ? `?objekt=${objectId}` : ""}`}
              className="flex-1"
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
            <Button size="sm" disabled className="flex-1 font-semibold gap-1.5">
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
              title="Selbstauskunft (PDF) herunterladen"
              aria-label="Selbstauskunft (PDF) herunterladen"
              className="px-2.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
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
