"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, TrendingUp } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/shared/MetricCard";
import { CompletionBar } from "@/components/shared/CompletionBar";
import { getAllProperties } from "@/lib/property-service";
import { getProfile } from "@/lib/profile-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { estimateFinancing } from "@/features/financing/calculations";
import {
  stammdatenCompletion,
  haushaltCompletion,
  strategieCompletion,
  immobilienCompletion,
} from "@/features/profile/completeness";
import type { Property } from "@/lib/supabase";
import type { Profile } from "@/features/profile/types";
import { formatCurrency } from "@/lib/utils";

const eur = (v: number) => formatCurrency(v, "de-DE");

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllProperties(), getProfile()]).then(([ps, pr]) => {
      setProperties(ps);
      setProfile(pr);
      setLoading(false);
    });
  }, []);

  const kpis = calculatePortfolioKpis(
    properties.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      inputs: p.inputs,
    })),
  );
  const haushalt = profile?.haushalt ?? {};
  const est = estimateFinancing(haushalt, kpis.monthlyCashFlowBeforeTax);

  const sections = [
    { label: "Haushaltsrechnung", href: "/haushalt", value: haushaltCompletion(haushalt) },
    { label: "Stammdaten", href: "/stammdaten", value: stammdatenCompletion(profile?.stammdaten ?? {}) },
    {
      label: "Immobilien",
      href: "/portfolio",
      value: immobilienCompletion(properties.map((p) => ({ selbstauskunft: p.inputs.selbstauskunft }))),
    },
    { label: "Strategie", href: "/strategie", value: strategieCompletion(profile?.strategie ?? {}) },
  ];

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
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <MetricCard
                label="Sparrate / Monat"
                value={eur(est.sparrate)}
                accent={est.sparrate >= 0 ? "#10b981" : "#ef4444"}
              />
              <MetricCard
                label="Finanzierungsvolumen"
                value={eur(est.finanzierungsvolumen)}
                accent="#6c5ce7"
              />
              <MetricCard
                label="Immobilien-Cashflow / Mon."
                value={eur(est.immobilienCashflow)}
              />
              <MetricCard label="Netto-Immobilienvermögen" value={eur(kpis.netPropertyEquity)} />
              <MetricCard label="Portfolio-Wert" value={eur(kpis.estimatedPortfolioValue)} />
              <MetricCard label="Verfügbares EK" value={eur(est.verfuegbaresEigenkapital)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sparrate composition */}
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Sparrate pro Monat
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Haushaltsüberschuss zzgl. Cashflow deiner Immobilien.
                  </p>
                </div>
                <SparrateBar
                  haushalt={est.haushaltSparrate}
                  immobilien={est.immobilienCashflow}
                  total={est.sparrate}
                />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Row label="Einnahmen (Haushalt)" value={eur(est.haushaltEinnahmen)} />
                  <Row label="Ausgaben (Haushalt)" value={eur(-est.haushaltAusgaben)} />
                  <Row label="Haushaltsüberschuss" value={eur(est.haushaltSparrate)} />
                  <Row label="Immobilien-Cashflow" value={eur(est.immobilienCashflow)} />
                </div>
              </div>

              {/* Financing estimate */}
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#6c5ce7]" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Finanzierungsschätzung
                  </h3>
                </div>
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {eur(est.finanzierungsvolumen)}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Grobe Schätzung deines möglichen Finanzierungsvolumens aus Sparrate
                  ({eur(est.sparrate)}/Monat) und verfügbarem Eigenkapital
                  ({eur(est.verfuegbaresEigenkapital)}). Davon rechnerisch als Darlehen
                  tragbar: <strong>{eur(est.finanzierbaresDarlehen)}</strong>.
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Unverbindliche Schätzung, keine Finanzierungszusage. Die konkrete
                  Bewertung nimmt die Bank vor.
                </p>
              </div>
            </div>

            {/* Completion overview */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">
                Deine Unterlagen
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sections.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="flex flex-col gap-1.5 rounded-lg border border-border px-4 py-3 hover:border-[#6c5ce7]/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{s.label}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {Math.round(s.value)}%
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>
                    <CompletionBar value={s.value} />
                  </Link>
                ))}
              </div>
              <Link
                href="/banken"
                className="self-start text-sm font-medium text-[#6c5ce7] hover:underline flex items-center gap-1"
              >
                Zu den Banken <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

// Composition bar: household surplus + property cash flow, each clamped to a
// share of the positive total for the visual (real numbers shown alongside).
function SparrateBar({
  haushalt,
  immobilien,
  total,
}: {
  haushalt: number;
  immobilien: number;
  total: number;
}) {
  const posHaushalt = Math.max(0, haushalt);
  const posImmobilien = Math.max(0, immobilien);
  const base = posHaushalt + posImmobilien || 1;
  const hPct = (posHaushalt / base) * 100;
  const iPct = (posImmobilien / base) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div style={{ width: `${hPct}%`, backgroundColor: "#6c5ce7" }} />
        <div style={{ width: `${iPct}%`, backgroundColor: "#10b981" }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#6c5ce7" }} />
          Haushalt
          <span className="h-2 w-2 rounded-full ml-3" style={{ backgroundColor: "#10b981" }} />
          Immobilien
        </span>
        <span className="tabular-nums font-semibold text-foreground">
          = {eur(total)}/Mon.
        </span>
      </div>
    </div>
  );
}
