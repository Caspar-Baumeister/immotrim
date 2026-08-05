"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { getProfile, saveProfileSection } from "@/lib/profile-service";
import { DocumentUploadCore } from "@/features/extraction/DocumentUploadCore";
import { SectionHeader } from "./SectionHeader";
import { ProfileForm, type ProfileFieldGroup } from "./ProfileForm";
import { makeSectionAdapter } from "../section-config";
import { stammdatenCompletion, haushaltCompletion } from "../completeness";
import { useSetSectionCompletion } from "../completion-context";
import type { Stammdaten, Haushalt } from "../types";

type Values = Record<string, string | number | undefined>;

// Powers the Stammdaten and Haushaltsrechnung pages: load → edit form →
// upload documents → AI-review into the form → save. Immobilien and Strategie
// have bespoke pages; everything else shares this shell.
export function ProfileSectionPage({
  section,
  title,
  description,
  help,
  groups,
  uploadTitle,
  uploadHint,
}: {
  section: "stammdaten" | "haushalt";
  title: string;
  description: string;
  help: React.ReactNode;
  groups: ProfileFieldGroup[];
  uploadTitle: string;
  uploadHint: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (p) setValues((p[section] as Values) ?? {});
      setLoading(false);
    });
  }, [section]);

  const setValue = (key: string, value: string | number | undefined) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const applyPatch = (patch: Record<string, string | number>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const clean = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== undefined && v !== ""),
      );
      await saveProfileSection(
        section,
        clean as unknown as Stammdaten & Haushalt,
      );
      setSaved(true);
      // Re-render the server layout so the sidebar completion bars pick up the
      // just-saved values (they're computed server-side and won't update on their own).
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const completion =
    section === "stammdaten"
      ? stammdatenCompletion(values as Stammdaten)
      : haushaltCompletion(values as Haushalt);

  // Push the live completion into the sidebar so its bar rises as the user types,
  // not only after saving.
  const setSectionCompletion = useSetSectionCompletion(section);
  useEffect(() => {
    if (!loading) setSectionCompletion(completion);
  }, [completion, loading, setSectionCompletion]);

  const adapter = makeSectionAdapter({
    mode: section,
    getValue: (key) => values[key],
    applyPatch,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={title} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto max-w-5xl w-full">
        <SectionHeader
          title={title}
          description={description}
          completion={completion}
          help={help}
        />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <ProfileForm groups={groups} values={values} onChange={setValue} />
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Speichern
                </Button>
                {saved && (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Gespeichert
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {uploadTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{uploadHint}</p>
              </div>
              <DocumentUploadCore target={{ category: section }} adapter={adapter} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
