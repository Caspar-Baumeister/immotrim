"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Image as ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/features/profile/components/SectionHeader";
import { getProfile, saveProfileSection } from "@/lib/profile-service";
import { uploadDocument, getDownloadUrl } from "@/lib/document-service";
import { strategieCompletion } from "@/features/profile/completeness";
import { useSetSectionCompletion } from "@/features/profile/completion-context";
import type { Strategie } from "@/features/profile/types";

const ACCEPTED_IMAGE = ["image/png", "image/jpeg", "image/webp"];

export default function StrategiePage() {
  const router = useRouter();
  const [data, setData] = useState<Strategie>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile().then((p) => {
      if (p) setData(p.strategie ?? {});
      setLoading(false);
    });
  }, []);

  // Resolve a signed preview URL whenever the stored image path changes.
  useEffect(() => {
    if (data.imagePath) getDownloadUrl(data.imagePath).then(setImageUrl);
    else setImageUrl(null);
  }, [data.imagePath]);

  const setField = (patch: Partial<Strategie>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleImage = async (file: File | undefined) => {
    if (!file || !ACCEPTED_IMAGE.includes(file.type)) return;
    setUploadingImage(true);
    try {
      const row = await uploadDocument(file, { category: "strategie" });
      setField({ imagePath: row.file_path });
    } finally {
      setUploadingImage(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfileSection("strategie", data);
      setSaved(true);
      // Re-render the server layout so the sidebar completion bar reflects the save.
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const completion = strategieCompletion(data);

  // Push the live completion into the sidebar so its bar rises as the user edits,
  // not only after saving.
  const setSectionCompletion = useSetSectionCompletion("strategie");
  useEffect(() => {
    if (!loading) setSectionCompletion(completion);
  }, [completion, loading, setSectionCompletion]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Strategie" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto max-w-5xl w-full">
        <SectionHeader
          title="Strategie & Über mich"
          description="Deine Investmentstrategie und ein persönlicher Text — beides erscheint auf der Bank-Selbstauskunft und macht deinen Antrag greifbar."
          completion={completion}
          help={
            <>
              Beschreibe, wie du investierst (Ziele, Objekttypen, Regionen, Horizont)
              und wer du bist. Ein Profilbild wirkt seriös und wird oben auf der
              Selbstauskunft eingebunden.
            </>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-5">
            {/* Profile image */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl border border-border bg-muted/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="Profil" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Profilbild</Label>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE.join(",")}
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0])}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploadingImage}
                    className="gap-1.5"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {data.imagePath ? "Ändern" : "Hochladen"}
                  </Button>
                  {data.imagePath && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setField({ imagePath: undefined })}
                      className="gap-1.5 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Entfernen
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="strategieText" className="text-xs text-muted-foreground">
                Investmentstrategie
              </Label>
              <textarea
                id="strategieText"
                value={data.strategieText ?? ""}
                onChange={(e) => setField({ strategieText: e.target.value })}
                rows={5}
                placeholder="z.B. Fokus auf vermietete Bestandswohnungen in B-Lagen mit stabilem Cashflow, langfristiger Buy-and-Hold-Horizont …"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ueberMich" className="text-xs text-muted-foreground">
                Über mich
              </Label>
              <textarea
                id="ueberMich"
                value={data.ueberMich ?? ""}
                onChange={(e) => setField({ ueberMich: e.target.value })}
                rows={4}
                placeholder="Kurzer persönlicher Text: beruflicher Hintergrund, Erfahrung mit Immobilien, warum du finanzieren möchtest …"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"
              />
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-border mt-1">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white gap-1.5 mt-4"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Speichern
              </Button>
              {saved && (
                <span className="text-xs text-emerald-500 flex items-center gap-1 mt-4">
                  <Check className="h-3.5 w-3.5" /> Gespeichert
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
