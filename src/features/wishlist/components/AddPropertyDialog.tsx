"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Link2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createWishlistProperty } from "../wishlist-service";
import type { WishlistDraft } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  onCreated?: () => void;
};

type Tab = "manual" | "expose";

export function AddPropertyDialog({ open, onOpenChange, locale, onCreated }: Props) {
  const t = useTranslations("wishlist.add");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [kaufpreis, setKaufpreis] = useState("");
  const [wohnflaeche, setWohnflaeche] = useState("");
  const [kaltmiete, setKaltmiete] = useState("");
  const [eigenanteil, setEigenanteil] = useState("");
  const [exposeUrl, setExposeUrl] = useState("");

  function resetForm() {
    setName("");
    setAddress("");
    setKaufpreis("");
    setWohnflaeche("");
    setKaltmiete("");
    setEigenanteil("");
    setExposeUrl("");
    setError(null);
    setTab("manual");
  }

  const parseNum = (s: string): number | null => {
    const v = parseFloat(s.replace(",", "."));
    return isNaN(v) ? null : v;
  };

  async function handleSave() {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    const draft: WishlistDraft = {
      name: name.trim(),
      address: address.trim() || null,
      exposeUrl: exposeUrl.trim() || null,
      kaufpreis: parseNum(kaufpreis),
      wohnflaeche: parseNum(wohnflaeche),
      zimmer: null,
      baujahr: null,
      kaltmiete: parseNum(kaltmiete),
      eigenanteil: parseNum(eigenanteil),
      nebenkostenPct: 10,
      nichtUmlagefaehigPctOfMiete: 5,
      notes: null,
    };
    try {
      const id = await createWishlistProperty(draft);
      resetForm();
      onOpenChange(false);
      if (onCreated) onCreated();
      router.push(`/${locale}/wishlist/${id}`);
    } catch (e) {
      console.error(e);
      setError(t("saveFailed"));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
            <Pencil className="h-3.5 w-3.5" />
            {t("manual")}
          </TabButton>
          <Tooltip>
            <TooltipTrigger
              render={
                <TabButton active={false} disabled>
                  <Link2 className="h-3.5 w-3.5" />
                  {t("expose")}
                </TabButton>
              }
            />
            <TooltipContent side="bottom" className="max-w-[220px] text-center">
              {t("exposeDisabled")}
            </TooltipContent>
          </Tooltip>
        </div>

        {tab === "manual" && (
          <div className="flex flex-col gap-3">
            <Field label={t("name") + " *"}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </Field>
            <Field label={t("address")}>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("price")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={kaufpreis}
                  onChange={(e) => setKaufpreis(e.target.value)}
                  placeholder="380000"
                />
              </Field>
              <Field label={t("area")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={wohnflaeche}
                  onChange={(e) => setWohnflaeche(e.target.value)}
                  placeholder="78"
                />
              </Field>
              <Field label={t("rent")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={kaltmiete}
                  onChange={(e) => setKaltmiete(e.target.value)}
                  placeholder="1100"
                />
              </Field>
              <Field label={t("equity")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={eigenanteil}
                  onChange={(e) => setEigenanteil(e.target.value)}
                  placeholder="80000"
                />
              </Field>
            </div>
            <Field label={t("exposeUrl")}>
              <Input
                value={exposeUrl}
                onChange={(e) => setExposeUrl(e.target.value)}
                placeholder="https://www.immobilienscout24.de/expose/..."
              />
            </Field>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || tab !== "manual"}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  disabled,
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
        active
          ? "bg-card text-foreground ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
