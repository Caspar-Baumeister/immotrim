"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { SectionHeader } from "@/features/profile/components/SectionHeader";
import { KonzeptForm } from "@/features/konzepte/components/KonzeptForm";
import { createKonzept } from "@/features/konzepte/konzept-service";
import { EMPTY_KONZEPT_DRAFT, type KonzeptDraft } from "@/features/konzepte/types";

export default function NewKonzeptPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<KonzeptDraft>(EMPTY_KONZEPT_DRAFT);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = await createKonzept(draft);
      router.push(`/konzepte/${id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Neues Konzept" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto max-w-5xl w-full">
        <SectionHeader
          title="Neues Finanzierungskonzept"
          description="Beschreibe ein Vorhaben so, wie du es der Bank vorstellen willst. Nach dem Speichern kannst du Objektunterlagen hochladen und pro Bank die Anfrage erstellen."
        />
        <KonzeptForm
          draft={draft}
          onChange={setDraft}
          onSave={handleSave}
          saving={saving}
          saved={false}
        />
      </div>
    </div>
  );
}
