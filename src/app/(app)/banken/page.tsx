"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { BankCard } from "@/features/banks/components/BankCard";
import { BANKS } from "@/features/banks/registry";
import { getAllProperties } from "@/lib/property-service";
import { getProfile } from "@/lib/profile-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { estimateFinancing, bankFinancingScore } from "@/features/financing/calculations";
import {
  stammdatenCompletion,
  haushaltCompletion,
  strategieCompletion,
  immobilienCompletion,
} from "@/features/profile/completeness";
import type { Property } from "@/lib/supabase";
import type { Profile } from "@/features/profile/types";

export default function BankenPage() {
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

  // A bank Selbstauskunft draws on every section, so bank completeness is the
  // average of the four section completions; "missing" lists any below 100%.
  const sections = [
    { label: "Haushaltsrechnung", value: haushaltCompletion(haushalt) },
    { label: "Stammdaten", value: stammdatenCompletion(profile?.stammdaten ?? {}) },
    {
      label: "Immobilien",
      value: immobilienCompletion(
        properties.map((p) => ({ selbstauskunft: p.inputs.selbstauskunft })),
      ),
    },
    { label: "Strategie", value: strategieCompletion(profile?.strategie ?? {}) },
  ];
  const completeness = Math.round(
    sections.reduce((s, x) => s + x.value, 0) / sections.length,
  );
  const missing = sections.filter((s) => s.value < 100).map((s) => s.label);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Banken" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto">
        <div>
          <h1 className="text-lg font-semibold font-heading text-foreground">
            Banken
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Sieh pro Bank, wie vollständig deine Unterlagen sind und wie gut deine
            Finanzierung passt (Schätzung). Ist alles bereit, erzeugst du direkt die
            passende Selbstauskunft und findest die Kontaktdaten.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {BANKS.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                completeness={completeness}
                score={bankFinancingScore(
                  est,
                  bank.conditions ?? {},
                  haushalt.nettoeinkommen ?? 0,
                )}
                missing={missing}
                disabled={properties.length === 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
