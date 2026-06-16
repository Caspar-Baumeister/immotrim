"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlusCircle, LineChart } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { GlobalAssumptionsBar } from "@/features/wishlist/components/GlobalAssumptionsBar";
import { WishlistTable } from "@/features/wishlist/components/WishlistTable";
import {
  getAllWishlistProperties,
  deleteWishlistProperty,
} from "@/features/wishlist/wishlist-service";
import type { WishlistProperty } from "@/features/wishlist/types";

type Props = { params: Promise<{ locale: string }> };

export default function WishlistPage({ params }: Props) {
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations("wishlist");
  const tDelete = useTranslations();
  const [rows, setRows] = useState<WishlistProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const goToNew = () => router.push(`/${locale}/wishlist/new`);

  function load() {
    getAllWishlistProperties().then((r) => {
      setRows(r);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm(tDelete("deleteConfirm"))) return;
    setDeleting(id);
    try {
      await deleteWishlistProperty(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("title")} locale={locale} />

      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 overflow-auto">
        <GlobalAssumptionsBar />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {rows.length}{" "}
            {rows.length === 1 ? t("propertySingular") : t("propertyPlural")}
          </h2>
          <Button
            size="sm"
            onClick={goToNew}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {t("add.cta")}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 sm:py-20 px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <LineChart className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{t("empty")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("emptyDesc")}</p>
            </div>
            <Button
              onClick={goToNew}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {t("addFirst")}
            </Button>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <WishlistTable
            rows={rows}
            locale={locale}
            onDelete={handleDelete}
            deletingId={deleting}
          />
        )}
      </div>
    </div>
  );
}
