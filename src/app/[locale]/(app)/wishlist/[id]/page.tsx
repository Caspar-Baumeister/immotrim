"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { WishlistForm } from "@/features/wishlist/components/WishlistForm";
import { WishlistLivePreview } from "@/features/wishlist/components/WishlistLivePreview";
import { WishlistDocumentUpload } from "@/features/wishlist/components/WishlistDocumentUpload";
import { useWishlistFormStore } from "@/features/wishlist/wishlist-form-store";
import {
  getWishlistProperty,
  updateWishlistProperty,
  deleteWishlistProperty,
} from "@/features/wishlist/wishlist-service";

type Props = { params: Promise<{ locale: string; id: string }> };

export default function WishlistDetailPage({ params }: Props) {
  const { locale, id } = use(params);
  const t = useTranslations("wishlist");
  const tCommon = useTranslations();
  const router = useRouter();
  const store = useWishlistFormStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getWishlistProperty(id).then((p) => {
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      store.hydrate(p);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    if (!store.name.trim()) {
      setError(t("add.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWishlistProperty(id, store.toDraft());
      router.push(`/${locale}/wishlist`);
    } catch {
      setError(t("add.saveFailed"));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(tCommon("deleteConfirm"))) return;
    setDeleting(true);
    try {
      await deleteWishlistProperty(id);
      router.push(`/${locale}/wishlist`);
    } catch {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar locale={locale} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar locale={locale} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {t("notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("editTitle")} subtitle={store.name} locale={locale} />

      <div className="flex-1 flex">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl">
          <div className="mb-4">
            <Link
              href={`/${locale}/wishlist`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("backToList")}
            </Link>
          </div>

          <div className="mb-6">
            {/* Wishlist docs are grouped by draft_id (= the wishlist id); property_id
                is reserved for portfolio properties via its FK. */}
            <WishlistDocumentUpload target={{ draftId: id }} />
          </div>

          <WishlistForm />

          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {tCommon("actions.delete")}
            </Button>
            <div className="flex items-center gap-2">
              <Link href={`/${locale}/wishlist`}>
                <Button variant="ghost" disabled={saving}>
                  {tCommon("actions.cancel")}
                </Button>
              </Link>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("add.saving")}
                  </>
                ) : (
                  t("save")
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="w-64 flex-shrink-0 hidden lg:block p-6 border-l border-border">
          <WishlistLivePreview />
        </div>
      </div>
    </div>
  );
}
