"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  Landmark,
  Loader2,
  Plus,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/shared/MetricCard";
import { CompletionBar } from "@/components/shared/CompletionBar";
import { getAllProperties } from "@/lib/property-service";
import { getProfile } from "@/lib/profile-service";
import { getAllKonzepte } from "@/features/konzepte/konzept-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { estimateFinancing } from "@/features/financing/calculations";
import { useCompletion } from "@/features/profile/completion-context";
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

  const kpis = calculatePortfolioKpis(
    properties.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      inputs: p.inputs,
    })),
  );
  const est = estimateFinancing(profile?.haushalt ?? {}, kpis.monthlyCashFlowBeforeTax);

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
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aus diesen Unterlagen erstellt Immotrim deine bankfertige
                  Investorenbroschüre (Selbstauskunft) — die Grundlage jeder
                  Finanzierungsanfrage. Fülle die vier Bereiche aus:
                </p>
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
                {nextSection ? (
                  <Link
                    href={nextSection.href}
                    className="mt-auto self-start text-sm font-medium text-[#6c5ce7] hover:underline flex items-center gap-1"
                  >
                    Weiter mit {nextSection.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="mt-auto text-sm font-medium text-emerald-500">
                    Alle Unterlagen vollständig — deine Broschüre ist bankfertig.
                  </p>
                )}
              </div>

              {/* Bank-Anfrage */}
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#6c5ce7]" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Bei Banken anfragen
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Lege ein Konzept für dein Vorhaben an und erstelle daraus pro Bank
                  die fertige Finanzierungsanfrage — inklusive Investorenbroschüre
                  und aller Unterlagen.
                </p>
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
