"use client";

// The compile screen for one (Konzept, Bank) pair: generated German email text
// (copy-paste / mailto), the pre-filled Selbstauskunft-PDF, the Portfoliobericht
// (Investorenbroschüre), a ZIP of all documents and the per-bank checklist of
// what's still missing — everything the user needs to send the
// Finanzierungsanfrage in one place.

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import {
  GENERIC_SELBSTAUSKUNFT_ID,
  getBank,
  hasBankDocument,
} from "@/features/banks/registry";
import {
  BANK_DOC_PROFILES,
  bankCompletion,
  type BankMissingItem,
} from "@/features/banks/requirements";
import { getKonzept } from "@/features/konzepte/konzept-service";
import { listConceptObjects } from "@/features/konzepte/objekt-service";
import { objektLabel, type ConceptObject, type Konzept } from "@/features/konzepte/types";
import {
  buildAnfrageEmail,
  buildMailtoUrl,
  type AnfrageEmail,
} from "@/features/anfrage/email";
import { downloadAnfrageZip } from "@/features/anfrage/zip-bundle";
import {
  ANFRAGE_STATUS_LABELS,
  listRequestsForConcept,
  upsertRequestStatus,
  type AnfrageStatus,
} from "@/features/anfrage/request-service";
import { getAllProperties } from "@/lib/property-service";
import { getProfile } from "@/lib/profile-service";
import {
  listBorrowerDocuments,
  listConceptDocuments,
} from "@/lib/document-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { estimateFinancing } from "@/features/financing/calculations";
import { CHECKLIST_DOC_TYPES, type ChecklistDocType } from "@/lib/checklist/requirements";
import { SA_DOC_TYPES, type SaDocType } from "@/lib/selbstauskunft/requirements";
import { ReportDialog } from "@/features/report/components/ReportDialog";
import type { Property, PropertyDocument } from "@/lib/supabase";
import type { Profile } from "@/features/profile/types";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Kopiert" : label}
    </Button>
  );
}

function AnfragePageInner() {
  const { id, bankId } = useParams<{ id: string; bankId: string }>();
  const searchParams = useSearchParams();
  const paramObjektId = searchParams.get("objekt");
  const bank = getBank(bankId);

  const [konzept, setKonzept] = useState<Konzept | null>(null);
  const [objects, setObjects] = useState<ConceptObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [borrowerDocs, setBorrowerDocs] = useState<PropertyDocument[]>([]);
  const [conceptDocs, setConceptDocs] = useState<PropertyDocument[]>([]);
  const [status, setStatus] = useState<AnfrageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipNote, setZipNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getKonzept(id).then(async (k) => {
      if (cancelled) return;
      setKonzept(k);
      if (!k) {
        setLoading(false);
        return;
      }
      const [pr, ps, bd, os, rs] = await Promise.all([
        getProfile(),
        getAllProperties(),
        listBorrowerDocuments(),
        listConceptObjects(k.id),
        listRequestsForConcept(k.id),
      ]);
      if (cancelled) return;
      setProfile(pr);
      setProperties(ps);
      setBorrowerDocs(bd);
      setObjects(os);
      const request = rs.find((r) => r.bankId === bankId);
      setStatus(request?.status ?? null);
      // Object selection: URL param → object stored on the request → first object.
      const valid = (oid: string | null | undefined) =>
        oid && os.some((o) => o.id === oid) ? oid : null;
      setSelectedObjectId(valid(paramObjektId) ?? valid(request?.objectId) ?? os[0]?.id ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bankId]);

  // Concept docs depend on the selected object: shared docs + that object's exposé.
  useEffect(() => {
    if (!konzept) return;
    let cancelled = false;
    listConceptDocuments(konzept.id, selectedObjectId).then((cd) => {
      if (!cancelled) setConceptDocs(cd);
    });
    return () => {
      cancelled = true;
    };
  }, [konzept, selectedObjectId]);

  const selectedObject = objects.find((o) => o.id === selectedObjectId) ?? null;

  const kpis = calculatePortfolioKpis(
    properties.map((p) => ({ id: p.id, name: p.name, address: p.address, inputs: p.inputs })),
  );
  const est = estimateFinancing(profile?.haushalt ?? {}, kpis.monthlyCashFlowBeforeTax);

  const completion = useMemo(() => {
    const presentBorrower = new Set<ChecklistDocType>(
      borrowerDocs
        .map((d) => d.doc_type)
        .filter((t): t is ChecklistDocType =>
          (CHECKLIST_DOC_TYPES as readonly string[]).includes(t ?? ""),
        ),
    );
    const presentObject = new Set<SaDocType>(
      conceptDocs
        .map((d) => d.doc_type)
        .filter((t): t is SaDocType =>
          (SA_DOC_TYPES as readonly string[]).includes(t ?? ""),
        ),
    );
    return bankCompletion(bankId, presentBorrower, presentObject);
  }, [bankId, borrowerDocs, conceptDocs]);

  // Banks without their own form get the bank-neutral Immotrim Selbstauskunft —
  // same data, no bank branding — so EVERY Anfrage ships with a filled form.
  const withDocument = hasBankDocument(bankId);
  const documentBankId = withDocument ? bankId : GENERIC_SELBSTAUSKUNFT_ID;
  const pdfName =
    withDocument && bank
      ? `Selbstauskunft-${bank.shortName}.pdf`
      : "Selbstauskunft-Immotrim.pdf";

  const attachmentNames = useMemo(
    () => [
      pdfName,
      ...borrowerDocs.map((d) => d.file_name),
      ...conceptDocs.map((d) => d.file_name),
    ],
    [pdfName, borrowerDocs, conceptDocs],
  );

  const mail: AnfrageEmail | null =
    bank && konzept
      ? buildAnfrageEmail({
          bank,
          konzept,
          objekt: selectedObject?.data,
          stammdaten: profile?.stammdaten ?? {},
          strategie: profile?.strategie ?? {},
          est,
          propertyCount: properties.length,
          attachmentNames,
        })
      : null;

  const fetchPdf = async (): Promise<Blob | null> => {
    const res = await fetch(`/api/selbstauskunft/${documentBankId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: id, objectId: selectedObjectId ?? undefined }),
    });
    if (res.status === 402) {
      setError("Für die PDF-Erstellung ist ein bezahlter Tarif nötig. Weiterleitung …");
      window.location.assign("/pricing");
      return null;
    }
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.blob();
  };

  const handlePdfDownload = async () => {
    setPdfBusy(true);
    setError(null);
    try {
      const blob = await fetchPdf();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("PDF-Erstellung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPdfBusy(false);
    }
  };

  const handleZip = async () => {
    if (!bank || !konzept) return;
    setZipBusy(true);
    setError(null);
    setZipNote(null);
    try {
      let pdf: { name: string; blob: Blob } | undefined;
      try {
        const blob = await fetchPdf();
        if (blob) pdf = { name: pdfName, blob };
        else return; // 402 → redirect already running
      } catch {
        setZipNote("Selbstauskunft-PDF konnte nicht erzeugt werden — ZIP enthält nur die Dokumente.");
      }
      const zipName = `Finanzierungsanfrage-${bank.shortName}-${konzept.title}`
        .replace(/[^a-zA-Z0-9äöüÄÖÜß ._-]/g, "")
        .slice(0, 80);
      const failed = await downloadAnfrageZip({
        borrowerDocs,
        objectDocs: conceptDocs,
        pdf,
        zipName: `${zipName}.zip`,
      });
      if (failed.length > 0) {
        setZipNote(`Nicht enthalten (Download fehlgeschlagen): ${failed.join(", ")}`);
      }
    } catch {
      setError("ZIP konnte nicht erstellt werden. Bitte erneut versuchen.");
    } finally {
      setZipBusy(false);
    }
  };

  const markRequested = async () => {
    if (!konzept) return;
    setStatus("angefragt");
    try {
      await upsertRequestStatus(konzept.id, bankId, "angefragt", {
        sentAt: new Date().toISOString(),
        objectId: selectedObjectId,
      });
    } catch {
      setStatus(null);
    }
  };

  if (!bank) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Finanzierungsanfrage" />
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">
            Unbekannte Bank.{" "}
            <Link href="/banken" className="text-[#6c5ce7] hover:underline">
              Zur Bankenübersicht
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Finanzierungsanfrage" />
        <div className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
        </div>
      </div>
    );
  }

  if (!konzept) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Finanzierungsanfrage" />
        <div className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">
            Konzept nicht gefunden.{" "}
            <Link href="/konzepte" className="text-[#6c5ce7] hover:underline">
              Zur Übersicht
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const pflichtMissing = completion.missing.filter((m) => m.level === "pflicht");
  const hints = BANK_DOC_PROFILES[bankId]?.extraHints ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={`Anfrage: ${bank.shortName}`} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 overflow-auto max-w-4xl w-full">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link
              href={`/banken?konzept=${konzept.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> zurück zu den Banken
            </Link>
            <h1 className="text-lg font-semibold font-heading text-foreground mt-1">
              Finanzierungsanfrage an {bank.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Konzept: <span className="text-foreground">{konzept.title}</span>
            </p>
            {objects.length >= 2 ? (
              <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                Objekt:
                <select
                  value={selectedObjectId ?? ""}
                  onChange={(e) => setSelectedObjectId(e.target.value || null)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none"
                >
                  {objects.map((o) => (
                    <option key={o.id} value={o.id}>
                      {objektLabel(o)}
                    </option>
                  ))}
                </select>
              </label>
            ) : selectedObject ? (
              <p className="text-xs text-muted-foreground mt-1">
                Objekt: <span className="text-foreground">{objektLabel(selectedObject)}</span>
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {ANFRAGE_STATUS_LABELS[status]}
              </span>
            )}
            <Button
              size="sm"
              onClick={markRequested}
              disabled={status === "angefragt"}
              className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> Als angefragt markieren
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* 1. Unterlagen-Status */}
        <Panel title={`Unterlagen-Status für ${bank.shortName} (${completion.pct}%)`}>
          {completion.missing.length === 0 ? (
            <p className="text-xs text-emerald-500">
              Alle Unterlagen vollständig — du kannst die Anfrage abschicken.
            </p>
          ) : (
            <>
              {pflichtMissing.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Es fehlen noch <span className="text-foreground">{pflichtMissing.length} Pflicht-Unterlagen</span> — du kannst die Anfrage trotzdem senden und sie nachreichen.
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {completion.missing.map((m: BankMissingItem) => (
                  <li key={`${m.scope}-${m.label}`} className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        m.level === "pflicht"
                          ? "h-2 w-2 rounded-full bg-red-500"
                          : m.level === "empfohlen"
                            ? "h-2 w-2 rounded-full bg-orange-500"
                            : "h-2 w-2 rounded-full bg-yellow-500"
                      }
                    />
                    <span className="text-foreground">{m.label}</span>
                    <Link
                      href={m.scope === "borrower" ? "/checklist" : `/konzepte/${konzept.id}`}
                      className="ml-auto text-[#6c5ce7] hover:underline"
                    >
                      {m.scope === "borrower" ? "zur Checkliste" : "zum Konzept"}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {hints.length > 0 && (
            <div className="rounded-lg bg-muted/10 border border-border px-3 py-2 flex flex-col gap-1">
              {hints.map((h) => (
                <p key={h} className="text-[11px] text-muted-foreground">
                  {h}
                </p>
              ))}
            </div>
          )}
        </Panel>

        {/* 2. E-Mail */}
        {mail && (
          <Panel title="E-Mail-Text">
            <p className="text-xs text-muted-foreground">
              {bank.email ? (
                <>
                  Kopiere Betreff und Text in dein E-Mail-Programm an{" "}
                  <span className="text-foreground">{bank.email}</span> und hänge die
                  Dateien aus dem ZIP an.
                </>
              ) : (
                <>
                  {bank.shortName} veröffentlicht kein Anfrage-Postfach — nutze den Text
                  im{" "}
                  {bank.contactUrl ? (
                    <a
                      href={bank.contactUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[#6c5ce7] hover:underline"
                    >
                      Kontaktformular
                    </a>
                  ) : (
                    "Kontaktformular"
                  )}{" "}
                  und reiche die Unterlagen nach dem Erstkontakt ein.
                </>
              )}
            </p>
            <div className="rounded-lg border border-border bg-muted/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Betreff</p>
              <p className="text-xs text-foreground">{mail.subject}</p>
            </div>
            <pre className="rounded-lg border border-border bg-muted/10 px-3 py-2 text-xs text-foreground whitespace-pre-wrap font-sans max-h-96 overflow-auto">
              {mail.body}
            </pre>
            <div className="flex items-center gap-2 flex-wrap">
              <CopyButton text={mail.subject} label="Betreff kopieren" />
              <CopyButton text={mail.body} label="Text kopieren" />
              {bank.email && (
                <a href={buildMailtoUrl(bank.email, mail)}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Im E-Mail-Programm öffnen
                  </Button>
                </a>
              )}
              {!bank.email && bank.contactUrl && (
                <a href={bank.contactUrl} target="_blank" rel="noreferrer noopener">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Kontaktformular öffnen
                  </Button>
                </a>
              )}
            </div>
          </Panel>
        )}

        {/* 3. Selbstauskunft-PDF */}
        <Panel title="Selbstauskunft (PDF)">
          <p className="text-xs text-muted-foreground">
            {withDocument ? (
              <>
                Das {bank.shortName}-Formular, vorausgefüllt mit deinem Profil, deinem
                Portfolio und diesem Konzept (inkl. Finanzierungswunsch).
              </>
            ) : (
              <>
                {bank.shortName} hat kein eigenes Formular — du erhältst die
                bankneutrale Selbstauskunft, vorausgefüllt mit deinem Profil, deinem
                Portfolio und diesem Konzept (inkl. Finanzierungswunsch).
              </>
            )}
          </p>
          <div>
            <Button
              size="sm"
              onClick={handlePdfDownload}
              disabled={pdfBusy}
              className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
            >
              {pdfBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              PDF erstellen & herunterladen
            </Button>
          </div>
        </Panel>

        {/* 4. Investorenbroschüre (Portfoliobericht) */}
        <Panel title="Investorenbroschüre (PDF)">
          {properties.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Dein Immobilienportfolio als bankfertiger Bericht — mit Grafiken zu
                Wert, Restschuld und Cashflow. Ideal als Anlage zur Anfrage,
                ergänzend zur klassischen Selbstauskunft.
              </p>
              <div>
                <Button
                  size="sm"
                  onClick={() => setReportOpen(true)}
                  className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Broschüre erstellen & herunterladen
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sobald du Immobilien in deinem{" "}
              <Link href="/portfolio" className="text-[#6c5ce7] hover:underline">
                Portfolio
              </Link>{" "}
              angelegt hast, erstellt Immotrim hier die Investorenbroschüre mit den
              Grafiken deines Bestands.
            </p>
          )}
        </Panel>

        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          properties={properties}
        />

        {/* 5. ZIP-Bundle */}
        <Panel title="Unterlagen-Paket (ZIP)">
          <p className="text-xs text-muted-foreground">
            Alle persönlichen Unterlagen und Objektunterlagen sowie die frisch
            erzeugte Selbstauskunft in einem ZIP — bereit zum Anhängen.
          </p>
          <div>
            <Button
              size="sm"
              onClick={handleZip}
              disabled={zipBusy}
              className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
            >
              {zipBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileArchive className="h-3.5 w-3.5" />
              )}
              ZIP herunterladen
            </Button>
          </div>
          {zipNote && <p className="text-xs text-orange-400">{zipNote}</p>}
        </Panel>

        {/* 6. Anlagen-Checkliste */}
        <Panel title="Diese Dateien anhängen">
          {attachmentNames.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Noch keine Dokumente vorhanden — lade Unterlagen in der{" "}
              <Link href="/checklist" className="text-[#6c5ce7] hover:underline">
                Checkliste
              </Link>{" "}
              und im{" "}
              <Link href={`/konzepte/${konzept.id}`} className="text-[#6c5ce7] hover:underline">
                Konzept
              </Link>{" "}
              hoch.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {attachmentNames.map((n, i) => (
                <li key={`${n}-${i}`} className="flex items-center gap-2 text-xs text-foreground">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {n}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary during prerender.
export default function AnfragePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen">
          <TopBar title="Finanzierungsanfrage" />
          <div className="flex-1 flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        </div>
      }
    >
      <AnfragePageInner />
    </Suspense>
  );
}
