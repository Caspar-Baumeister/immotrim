"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PropertyForm } from "@/features/property-input/components/PropertyForm";
import { LivePreview } from "@/features/property-input/components/LivePreview";
import { DocumentUpload } from "@/features/property-input/components/DocumentUpload";
import type { AppliedPatch } from "@/features/property-input/extraction-types";
import { Button } from "@/components/ui/button";
import { usePropertyFormStore } from "@/lib/store";
import {
  getProperty,
  updateProperty,
  deleteProperty,
} from "@/lib/property-service";

type Props = { params: Promise<{ locale: string; id: string }> };

export default function EditPropertyPage({ params }: Props) {
  const { locale, id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const { name, address, inputs, setName, setAddress, setAllInputs } =
    usePropertyFormStore();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProperty(id).then((p) => {
      if (p) {
        setName(p.name);
        setAddress(p.address ?? "");
        setAllInputs(p.inputs);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const applyPatch = (patch: AppliedPatch) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.address !== undefined) setAddress(patch.address);
    if (patch.inputs) setAllInputs({ ...inputs, ...patch.inputs });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a property name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProperty(id, name, address, inputs);
      router.push(`/${locale}/property/${id}`);
    } catch {
      setError("Failed to save changes.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProperty(id);
      router.push(`/${locale}/portfolio`);
    } catch {
      setError("Failed to delete property.");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("property.edit")} locale={locale} />

      <div className="flex-1 flex">
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
          <div className="mb-6">
            <DocumentUpload
              target={{ propertyId: id }}
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

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/property/${id}`)}
              className="flex-1 border-border hover:bg-muted/50"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {t("actions.delete")}
          </button>
        </div>

        <div className="w-64 flex-shrink-0 hidden lg:block p-6 border-l border-border">
          <LivePreview />
        </div>
      </div>
    </div>
  );
}
