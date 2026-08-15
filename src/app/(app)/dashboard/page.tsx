"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Download,
  FileText,
  Landmark,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/shared/MetricCard";
import { CompletionBar, completionColor } from "@/components/shared/CompletionBar";
import { ChartCard } from "@/components/shared/ChartCard";
import { CashFlowChart } from "@/features/cash-flow/components/CashFlowChart";
import { WertSchuldenChart } from "@/features/appreciation/components/WertSchuldenChart";
import { VermoegensaufbauChart } from "@/features/wealth/components/VermoegensaufbauChart";
import { getAllProperties } from "@/lib/property-service";
import { getProfile } from "@/lib/profile-service";
import { getAllKonzepte } from "@/features/konzepte/konzept-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import {
  calculatePortfolioCashFlowSeries,
  calculatePortfolioAppreciationSeries,
  calculatePortfolioWealthSeries,
} from "@/features/portfolio/chart-calculations";
import { estimateFinancing } from "@/features/financing/calculations";
import { useCompletion } from "@/features/profile/completion-context";
import { GENERIC_SELBSTAUSKUNFT_ID } from "@/features/banks/registry";
import { useSelbstauskunftDownload } from "@/features/banks/hooks/useSelbstauskunftDownload";
import type { Property } from "@/lib/supabase";
import type { Profile } from "@/features/profile/types";
import type { Konzept } from "@/features/konzepte/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

const eur = (v: number) => formatCurrency(v, "de-DE");

// The four sections whose data feeds the Investorenbroschüre (Selbstauskunft).
// Immobilien is deliberately not in this list — the portfolio has its own
// overview below and a per-property completeness on /portfolio.
const BROSCHUERE_SECTIONS = [
  { key: "haushalt", label: "Haushaltsrechnung", href: "/haushalt" },
  { key: "stammdaten", label: "Stammdaten", href: "/stammdaten" },
  { key: "strategie", label: "Strategie", href: "/strategie" },
  { key: "checklist", label: "Checkliste (Dokumente)", href: "/checklist" },
] as const;

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [konzepte, setKonzepte] = useState<Konzept[]>([]);
  const [loading, setLoading] = useState(true);
  const completion = useCompletion();
  const selbstauskunft = useSelbstauskunftDownload(GENERIC_SELBSTAUSKUNFT_ID);

  useEffect(() => {
    Promise.all([getAllProperties(), getProfile(), getAllKonzepte()]).then(
      ([ps, pr, ks]) => {
        setProperties(ps);
        setProfile(pr);
        setKonzepte(ks);
        setLoading(false);
      },
    );
  }, []);

  const portfolioInputs = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    inputs: p.inputs,
  }));
  const kpis = calculatePortfolioKpis(portfolioInputs);
  const cashFlowSeries = calculatePortfolioCashFlowSeries(portfolioInputs);
  const appreciationSeries = calculatePortfolioAppreciationSeries(portfolioInputs);
  const wealthSeries = calculatePortfolioWealthSeries(portfolioInputs);
  const est = estimateFinancing(profile?.haushalt ?? {}, kpis.monthlyCashFlowBeforeTax);

  // Household finance KPIs — all derived from the already-computed estimate
  // plus the raw Vermögen fields of the Haushaltsrechnung.
  const haushalt = profile?.haushalt ?? {};
  const haushaltEmpty =
    est.haushaltEinnahmen === 0 && est.haushaltAusgaben === 0;
  const gesamtvermoegen =
    kpis.netPropertyEquity +
    (haushalt.bankSparguthaben ?? 0) +
    (haushalt.wertpapiere ?? 0) +
    (haushalt.sonstigesVermoegen ?? 0) -
    (haushalt.sonstigeVerbindlichkeiten ?? 0);
  const sparquote =
    est.haushaltEinnahmen > 0
      ? (est.haushaltSparrate / est.haushaltEinnahmen) * 100
      : null;
  const ltv =
    kpis.estimatedPortfolioValue > 0
      ? (kpis.outstandingLoanBalance / kpis.estimatedPortfolioValue) * 100
      : null;

  const sections = BROSCHUERE_SECTIONS.map((s) => ({
    ...s,
    value: completion[s.key],
  }));
  const overall = Math.round(
    sections.reduce((sum, s) => sum + s.value, 0) / sections.length,
  );
  const nextSection = sections.find((s) => s.value < 100);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Dashboard" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : (
          <>
            {/* Two paths: build the Investorenbroschüre, then take it to banks. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Investorenbroschüre */}
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#6c5ce7]" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Deine Investorenbroschüre
                    </h3>
                  </div>
                  <span className="text-xs tabular-nums font-semibold text-foreground">
                    {overall}%
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <PdfIllustration progress={overall} />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Aus diesen Unterlagen erstellt Immotrim deine bankfertige
                    Investorenbroschüre (Selbstauskunft) — die Grundlage jeder
                    Finanzierungsanfrage. Fülle die vier Bereiche aus:
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {sections.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      className="flex flex-col gap-1.5 rounded-lg border border-border px-4 py-2.5 hover:border-[#6c5ce7]/40 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {s.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {Math.round(s.value)}%
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </div>
                      <CompletionBar value={s.value} />
                    </Link>
                  ))}
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  {nextSection ? (
                    <Link
                      href={nextSection.href}
                      className="self-start text-sm font-medium text-[#6c5ce7] hover:underline flex items-center gap-1"
                    >
                      Weiter mit {nextSection.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-emerald-500">
                      Alle Unterlagen vollständig — deine Broschüre ist bankfertig.
                    </p>
                  )}
                  {/* Creating with partial data is allowed — open fields render
                      as blanks to complete by hand. */}
                  <Button
                    type="button"
                    size="sm"
                    variant={nextSection ? "outline" : undefined}
                    onClick={selbstauskunft.download}
                    disabled={selbstauskunft.busy}
                    className={
                      nextSection
                        ? "self-start gap-1.5"
                        : "self-start gap-1.5 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold"
                    }
                  >
                    {selbstauskunft.busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Selbstauskunft erstellen (PDF)
                  </Button>
                  {selbstauskunft.error && (
                    <p className="text-xs text-destructive">{selbstauskunft.error}</p>
                  )}
                </div>
              </div>

              {/* Bank-Anfrage */}
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#6c5ce7]" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Bei Banken anfragen
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <BankIllustration />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Lege ein Konzept für dein Vorhaben an und erstelle daraus pro
                    Bank die fertige Finanzierungsanfrage — inklusive
                    Investorenbroschüre und aller Unterlagen.
                  </p>
                </div>
                <ol className="flex flex-col gap-2 text-sm text-foreground">
                  <Step n={1} done={konzepte.length > 0}>
                    <Link href="/konzepte" className="hover:underline">
                      Konzept anlegen
                    </Link>{" "}
                    {konzepte.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({konzepte.length} vorhanden)
                      </span>
                    )}
                  </Step>
                  <Step n={2} done={false}>
                    <Link href="/banken" className="hover:underline">
                      Bank wählen &amp; Unterlagen-Check pro Bank
                    </Link>
                  </Step>
                  <Step n={3} done={false}>
                    Anfrage mit Broschüre &amp; Dokumenten versenden
                  </Step>
                </ol>
                <div className="rounded-lg bg-muted/30 px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Geschätztes Finanzierungsvolumen
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {eur(est.finanzierungsvolumen)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    aus Sparrate {eur(est.sparrate)}/Monat und Eigenkapital{" "}
                    {eur(est.verfuegbaresEigenkapital)} — unverbindliche Schätzung.
                  </span>
                </div>
                <Link
                  href={konzepte.length === 0 ? "/konzepte/new" : "/banken"}
                  className="mt-auto self-start text-sm font-medium text-[#6c5ce7] hover:underline flex items-center gap-1"
                >
                  {konzepte.length === 0 ? "Erstes Konzept anlegen" : "Zu den Banken"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Haushalts-Finanzen: monatliche Ströme + Vermögenskennzahlen,
                alles aus estimateFinancing bzw. den Haushalts-Rohfeldern. */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#6c5ce7]" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Deine Finanzen
                  </h3>
                </div>
                <Link
                  href="/haushalt"
                  className="text-sm font-medium text-[#6c5ce7] hover:underline flex items-center gap-1"
                >
                  Zur Haushaltsrechnung <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {haushaltEmpty ? (
                <Link
                  href="/haushalt"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-4 py-5 text-sm text-muted-foreground hover:border-[#6c5ce7]/50 hover:text-[#6c5ce7] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Fülle deine Haushaltsrechnung aus, um Einnahmen, Ausgaben und
                  Überschuss zu sehen.
                </Link>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  <MetricCard
                    label="Einnahmen / Monat"
                    value={eur(est.haushaltEinnahmen)}
                  />
                  <MetricCard
                    label="Ausgaben / Monat"
                    value={eur(est.haushaltAusgaben)}
                  />
                  <MetricCard
                    label="Haushalts-Überschuss"
                    value={eur(est.haushaltSparrate)}
                    accent={est.haushaltSparrate >= 0 ? "#10b981" : "#ef4444"}
                  />
                  <MetricCard
                    label="Überschuss inkl. Immobilien"
                    value={eur(est.sparrate)}
                    accent={est.sparrate >= 0 ? "#10b981" : "#ef4444"}
                  />
                  <MetricCard
                    label="Sparquote"
                    value={sparquote === null ? "—" : formatPercent(sparquote)}
                  />
                  <MetricCard
                    label="Gesamtvermögen (netto)"
                    value={eur(gesamtvermoegen)}
                    accent="#6c5ce7"
                  />
                  <MetricCard
                    label="Beleihungsquote (LTV)"
                    value={ltv === null ? "—" : formatPercent(ltv)}
                  />
                </div>
              )}
            </div>

            {/* Immobilien-Portfolio: minimal key figures — details live on /portfolio. */}
            {properties.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#6c5ce7]" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Dein Immobilien-Portfolio
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {properties.length}{" "}
                      {properties.length === 1 ? "Immobilie" : "Immobilien"}
                    </span>
                  </div>
                  <Link
                    href="/portfolio"
                    className="text-sm font-medium text-[#6c5ce7] hover:underline flex items-center gap-1"
                  >
                    Zur Portfolio-Übersicht <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  <MetricCard
                    label="Portfolio-Wert"
                    value={eur(kpis.estimatedPortfolioValue)}
                  />
                  <MetricCard
                    label="Netto-Immobilienvermögen"
                    value={eur(kpis.netPropertyEquity)}
                    accent="#6c5ce7"
                  />
                  <MetricCard
                    label="Cashflow / Monat"
                    value={eur(kpis.monthlyCashFlowBeforeTax)}
                    accent={kpis.monthlyCashFlowBeforeTax >= 0 ? "#10b981" : "#ef4444"}
                  />
                  <MetricCard
                    label="Brutto-Mietrendite"
                    value={formatPercent(kpis.grossRentalYield)}
                  />
                </div>
                {/* Compact chart teasers — the full six-chart analysis lives on
                    /portfolio; these three give the dashboard a visual pulse. */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <ChartCard
                    title="Vermögensaufbau pro Jahr"
                    subtitle="Tilgung + Cashflow + Wertwachstum aller Objekte"
                    expandLabel="Diagramm vergrößern"
                    modalContent={
                      <VermoegensaufbauChart
                        data={wealthSeries.years}
                        showWertwachstum={wealthSeries.hasWertwachstum}
                        height="100%"
                      />
                    }
                  >
                    <VermoegensaufbauChart
                      data={wealthSeries.years}
                      showWertwachstum={wealthSeries.hasWertwachstum}
                      height={160}
                    />
                  </ChartCard>
                  <ChartCard
                    title="Cashflow"
                    subtitle="Jährlicher Netto-Cashflow aller Objekte"
                    expandLabel="Diagramm vergrößern"
                    modalContent={
                      <CashFlowChart data={cashFlowSeries} monthly={false} height="100%" />
                    }
                  >
                    <CashFlowChart data={cashFlowSeries} monthly={false} height={160} />
                  </ChartCard>
                  <ChartCard
                    title="Immobilienwert vs. Schulden"
                    subtitle="Wert, Restschuld & Nettovermögen über die Zeit"
                    expandLabel="Diagramm vergrößern"
                    className="md:col-span-2 xl:col-span-1"
                    modalContent={
                      <WertSchuldenChart data={appreciationSeries} monthly={false} height="100%" />
                    }
                  >
                    <WertSchuldenChart data={appreciationSeries} monthly={false} height={160} />
                  </ChartCard>
                </div>
              </div>
            ) : (
              <Link
                href="/property/new"
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-4 py-5 text-sm text-muted-foreground hover:border-[#6c5ce7]/50 hover:text-[#6c5ce7] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Du besitzt bereits Immobilien? Lege sie an — sie stärken deine
                Broschüre und Finanzierung.
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Stylised PDF document stack with a completion ring — pure CSS/SVG so it
// follows the card/border/muted theme tokens in light and dark mode.
function PdfIllustration({ progress }: { progress: number }) {
  const r = 13;
  const circumference = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="relative w-20 h-24 shrink-0" aria-hidden>
      {/* back pages of the stack */}
      <div className="absolute inset-0 translate-x-2.5 -translate-y-1 rotate-6 rounded-lg border border-border bg-muted/50" />
      <div className="absolute inset-0 translate-x-1 rotate-3 rounded-lg border border-border bg-muted/70" />
      {/* front page */}
      <div className="absolute inset-0 rounded-lg border border-border bg-background shadow-sm p-2.5 flex flex-col gap-1.5 overflow-hidden">
        <div className="h-1.5 w-9 rounded-full bg-[#6c5ce7]" />
        <div className="h-1 w-full rounded-full bg-muted" />
        <div className="h-1 w-4/5 rounded-full bg-muted" />
        <div className="h-1 w-full rounded-full bg-muted" />
        <div className="mt-1 h-5 w-full rounded bg-[#6c5ce7]/10" />
        <span className="mt-auto self-start rounded bg-[#6c5ce7]/15 px-1 py-px text-[8px] font-bold tracking-wider text-[#6c5ce7]">
          PDF
        </span>
      </div>
      {/* completion ring, bottom-right corner */}
      <div className="absolute -bottom-1.5 -right-2.5 h-9 w-9 rounded-full bg-card border border-border shadow-sm flex items-center justify-center">
        <svg viewBox="0 0 32 32" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="16" cy="16" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
          <circle
            cx="16"
            cy="16"
            r={r}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            stroke={completionColor(p)}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - p / 100)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <span className="text-[8px] font-bold tabular-nums text-foreground">
          {p}%
        </span>
      </div>
    </div>
  );
}

// Big bank emblem: brand-gradient tile with soft concentric halos.
function BankIllustration() {
  return (
    <div className="relative w-20 h-24 shrink-0 flex items-center justify-center" aria-hidden>
      <div className="absolute h-20 w-20 rounded-full bg-[#6c5ce7]/8" />
      <div className="absolute h-14 w-14 rounded-full bg-[#6c5ce7]/12" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#6c5ce7] to-[#a29bfe] shadow-lg shadow-[#6c5ce7]/30">
        <Landmark className="h-7 w-7 text-white" />
      </div>
      {/* euro accent */}
      <span className="absolute top-0 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border shadow-sm text-[11px] font-bold text-[#6c5ce7]">
        €
      </span>
    </div>
  );
}

function Step({
  n,
  done,
  children,
}: {
  n: number;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={
          done
            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-500"
            : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
        }
      >
        {done ? "✓" : n}
      </span>
      <span>{children}</span>
    </li>
  );
}
