"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PropertyForm } from "@/features/property-input/components/PropertyForm";
import { LivePreview } from "@/features/property-input/components/LivePreview";
import { Button } from "@/components/ui/button";
import { usePropertyFormStore } from "@/lib/store";
import { createProperty } from "@/lib/property-service";

type Props = { params: Promise<{ locale: string }> };

export default function NewPropertyPage({ params }: Props) {
  const { locale } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const { name, address, inputs, reset } = usePropertyFormStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a property name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await createProperty(name, address, inputs);
      reset();
      router.push(`/${locale}/property/${id}`);
    } catch (e) {
      setError("Failed to save property. Please check your Supabase configuration.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("property.new")} locale={locale} />

      <div className="flex-1 flex">
        {/* Form column */}
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
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
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-11"
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
