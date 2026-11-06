"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PropertyForm } from "@/features/property-input/components/PropertyForm";
import { LivePreview } from "@/features/property-input/components/LivePreview";
import { DocumentUpload } from "@/features/property-input/components/DocumentUpload";
import type { AppliedPatch } from "@/features/property-input/extraction-types";
import { Button } from "@/components/ui/button";
import { usePropertyFormStore } from "@/lib/store";
import { createProperty, getAllProperties } from "@/lib/property-service";
import { linkDraftDocuments } from "@/lib/document-service";
import { useAccount } from "@/features/account/account-context";

export default function NewPropertyPage() {
  const t = useTranslations();
  const router = useRouter();
  const { name, address, inputs, setName, setAddress, setAllInputs, reset } =
    usePropertyFormStore();
  const [draftId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { plus, freePropertyLimit } = useAccount();
  const [atLimit, setAtLimit] = useState(false);

  // Free accounts track one property; offer Plus instead of a form that can't save.
  useEffect(() => {
    if (plus) return;
    getAllProperties().then((ps) => setAtLimit(ps.length >= freePropertyLimit));
  }, [plus, freePropertyLimit]);

  const applyPatch = (patch: AppliedPatch) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.address !== undefined) setAddress(patch.address);
    if (patch.inputs) setAllInputs({ ...inputs, ...patch.inputs });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Bitte gib der Immobilie einen Namen, zum Beispiel die Straße.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createProperty(name, address, inputs);
      if ("error" in result) {
        setAtLimit(true);
        setSaving(false);
        return;
      }
      await linkDraftDocuments(draftId, result.id);
      reset();
      router.push(`/property/${result.id}`);
    } catch {
      setError("Speichern hat nicht geklappt. Bitte versuche es noch einmal.");
      setSaving(false);
    }
  };

  if (atLimit) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title={t("property.new")} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4 bg-card border border-border rounded-2xl p-8">
            <h2 className="font-heading text-xl font-bold">Mehr Immobilien mit Immotrim Plus</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kostenlos verfolgst du eine Immobilie mit allen Kennzahlen. Mit Plus legst du dein
              ganzes Portfolio an, lässt Unterlagen auswerten und lädst die Bankenübersicht herunter.
            </p>
            <Link
              href="/pricing?reason=properties"
              className="inline-block bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Plus ansehen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("property.new")} />

      <div className="flex-1 flex">
        {/* Form column */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl">
          <div className="mb-6">
            <DocumentUpload
              target={{ draftId }}
              current={{ name, address, inputs }}
              onApply={applyPatch}
            />
          </div>

          <PropertyForm />

          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="mt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white font-semibold h-11"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("property.saving")}
                </>
              ) : (
                t("property.save")
              )}
            </Button>
          </div>
        </div>

        {/* Live preview sidebar */}
        <div className="w-64 flex-shrink-0 hidden lg:block p-6 border-l border-border">
          <LivePreview />
        </div>
      </div>
    </div>
  );
}
