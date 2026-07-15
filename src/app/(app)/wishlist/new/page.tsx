"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { WishlistForm } from "@/features/wishlist/components/WishlistForm";
import { WishlistLivePreview } from "@/features/wishlist/components/WishlistLivePreview";
import { WishlistDocumentUpload } from "@/features/wishlist/components/WishlistDocumentUpload";
import { useWishlistFormStore } from "@/features/wishlist/wishlist-form-store";
import { createWishlistProperty } from "@/features/wishlist/wishlist-service";
import { relinkWishlistDocuments } from "@/lib/document-service";

export default function NewWishlistPage() {
  const t = useTranslations("wishlist");
  const router = useRouter();
  const store = useWishlistFormStore();
  const [draftId] = useState(() => uuidv4());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from a clean form every time the create page mounts.
  useEffect(() => {
    store.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!store.name.trim()) {
      setError(t("add.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await createWishlistProperty(store.toDraft());
      await relinkWishlistDocuments(draftId, id);
      router.push(`/wishlist`);
    } catch (e) {
      console.error(e);
      setError(t("add.saveFailed"));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("add.title")} />

      <div className="flex-1 flex">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl">
          <div className="mb-4">
            <Link
              href={`/wishlist`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("backToList")}
            </Link>
          </div>

          <div className="mb-6">
            <WishlistDocumentUpload target={{ draftId }} />
          </div>

          <WishlistForm />

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
                  {t("add.saving")}
                </>
              ) : (
                t("save")
              )}
            </Button>
          </div>
        </div>

        <div className="w-64 flex-shrink-0 hidden lg:block p-6 border-l border-border">
          <WishlistLivePreview />
        </div>
      </div>
    </div>
  );
}
