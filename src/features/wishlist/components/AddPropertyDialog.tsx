"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { v4 as uuidv4 } from "uuid";
import { Loader2, FileText, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWishlistProperty } from "../wishlist-service";
import { LAGE_OPTIONS, type WishlistDraft } from "../types";
import type { WishlistPatch } from "../extraction-types";
import { ExposeUpload } from "./ExposeUpload";
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
  // Groups exposé uploads made before the wishlist row exists (see document-service).
  const [draftId, setDraftId] = useState(() => uuidv4());

  // Manual form fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [kaufpreis, setKaufpreis] = useState("");
  const [wohnflaeche, setWohnflaeche] = useState("");
  const [zimmer, setZimmer] = useState("");
  const [baujahr, setBaujahr] = useState("");
  const [kaltmiete, setKaltmiete] = useState("");
  const [eigenanteil, setEigenanteil] = useState("");
  const [exposeUrl, setExposeUrl] = useState("");
  const [lage, setLage] = useState<string>("");

  function resetForm() {
    setName("");
    setAddress("");
    setKaufpreis("");
    setWohnflaeche("");
    setZimmer("");
    setBaujahr("");
    setKaltmiete("");
    setEigenanteil("");
    setExposeUrl("");
    setLage("");
    setError(null);
    setTab("manual");
    setDraftId(uuidv4());
  }

  const parseNum = (s: string): number | null => {
    const v = parseFloat(s.replace(",", "."));
    return isNaN(v) ? null : v;
  };

  // Apply values read from an uploaded exposé into the manual form, then bring
  // the user to the manual tab so they can review and edit before saving.
  function applyExtraction(p: WishlistPatch) {
    if (p.name !== undefined) setName(p.name);
    if (p.address !== undefined) setAddress(p.address);
    if (p.kaufpreis !== undefined) setKaufpreis(String(p.kaufpreis));
    if (p.wohnflaeche !== undefined) setWohnflaeche(String(p.wohnflaeche));
    if (p.zimmer !== undefined) setZimmer(String(p.zimmer));
    if (p.baujahr !== undefined) setBaujahr(String(p.baujahr));
    if (p.kaltmiete !== undefined) setKaltmiete(String(p.kaltmiete));
    setTab("manual");
  }

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
      lage: lage || null,
      kaufpreis: parseNum(kaufpreis),
      wohnflaeche: parseNum(wohnflaeche),
      zimmer: parseNum(zimmer),
      baujahr: parseNum(baujahr),
      kaltmiete: parseNum(kaltmiete),
      eigenanteil: parseNum(eigenanteil),
      nebenkostenPct: 10,
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
          <TabButton active={tab === "expose"} onClick={() => setTab("expose")}>
            <FileText className="h-3.5 w-3.5" />
            {t("expose")}
          </TabButton>
        </div>

        {tab === "expose" && (
          <ExposeUpload
            draftId={draftId}
            current={{
              name,
              address,
              kaufpreis: parseNum(kaufpreis),
              wohnflaeche: parseNum(wohnflaeche),
              zimmer: parseNum(zimmer),
              baujahr: parseNum(baujahr),
              kaltmiete: parseNum(kaltmiete),
            }}
            onApply={applyExtraction}
          />
        )}

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
              <Field label={t("rooms")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={zimmer}
                  onChange={(e) => setZimmer(e.target.value)}
                  placeholder="3"
                />
              </Field>
              <Field label={t("yearBuilt")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={baujahr}
                  onChange={(e) => setBaujahr(e.target.value)}
                  placeholder="1998"
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
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <Field label={t("exposeUrl")}>
                <Input
                  value={exposeUrl}
                  onChange={(e) => setExposeUrl(e.target.value)}
                  placeholder="https://www.immobilienscout24.de/expose/..."
                />
              </Field>
              <Field label={t("lage")}>
                <select
                  value={lage}
                  onChange={(e) => setLage(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">—</option>
                  {LAGE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
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
            disabled={saving}
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
