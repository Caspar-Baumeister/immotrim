"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getWishlistProperty,
  updateWishlistProperty,
  deleteWishlistProperty,
} from "@/features/wishlist/wishlist-service";
import { calculateWishlistRowKpis } from "@/features/wishlist/calculations";
import { useGlobalAssumptions } from "@/features/wishlist/global-assumptions-store";
import { LAGE_OPTIONS, type WishlistDraft, type WishlistProperty } from "@/features/wishlist/types";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; id: string }> };

export default function WishlistDetailPage({ params }: Props) {
  const { locale, id } = use(params);
  const t = useTranslations("wishlist");
  const tCommon = useTranslations();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [exposeUrl, setExposeUrl] = useState("");
  const [lage, setLage] = useState<string>("");
  const [kaufpreis, setKaufpreis] = useState<string>("");
  const [wohnflaeche, setWohnflaeche] = useState<string>("");
  const [zimmer, setZimmer] = useState<string>("");
  const [baujahr, setBaujahr] = useState<string>("");
  const [kaltmiete, setKaltmiete] = useState<string>("");
  const [eigenanteil, setEigenanteil] = useState<string>("");
  const [nebenkostenPct, setNebenkostenPct] = useState<string>("10");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getWishlistProperty(id).then((p) => {
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      hydrate(p);
      setLoading(false);
    });
  }, [id]);

  function hydrate(p: WishlistProperty) {
    setName(p.name);
    setAddress(p.address ?? "");
    setExposeUrl(p.exposeUrl ?? "");
    setLage(p.lage ?? "");
    setKaufpreis(p.kaufpreis?.toString() ?? "");
    setWohnflaeche(p.wohnflaeche?.toString() ?? "");
    setZimmer(p.zimmer?.toString() ?? "");
    setBaujahr(p.baujahr?.toString() ?? "");
    setKaltmiete(p.kaltmiete?.toString() ?? "");
    setEigenanteil(p.eigenanteil?.toString() ?? "");
    setNebenkostenPct(p.nebenkostenPct.toString());
    setNotes(p.notes ?? "");
  }

  const parseNum = (s: string): number | null => {
    const v = parseFloat(s.replace(",", "."));
    return isNaN(v) ? null : v;
  };

  function buildDraft(): WishlistDraft {
    return {
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
      nebenkostenPct: parseNum(nebenkostenPct) ?? 10,
      notes: notes.trim() || null,
    };
  }

  // Live preview KPIs
  const assumptions = useGlobalAssumptions();
  const previewKpis = useMemo(() => {
    const draft = buildDraft();
    const fakeRow: WishlistProperty = {
      id,
      userId: "",
      createdAt: "",
      updatedAt: "",
      ...draft,
    };
    return calculateWishlistRowKpis(fakeRow, {
      zins: assumptions.zins,
      tilgung: assumptions.tilgung,
      leerstandPct: assumptions.leerstandPct,
      ruecklagenPctOfMiete: assumptions.ruecklagenPctOfMiete,
      nichtUmlagefaehigPctOfMiete: assumptions.nichtUmlagefaehigPctOfMiete,
      defaultEigenanteilPct: assumptions.defaultEigenanteilPct,
      yieldMode: assumptions.yieldMode,
      cashflowSettings: assumptions.cashflowSettings,
      ekReturnSettings: assumptions.ekReturnSettings,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    kaufpreis,
    wohnflaeche,
    kaltmiete,
    eigenanteil,
    nebenkostenPct,
    assumptions.zins,
    assumptions.tilgung,
    assumptions.leerstandPct,
    assumptions.ruecklagenPctOfMiete,
    assumptions.nichtUmlagefaehigPctOfMiete,
    assumptions.defaultEigenanteilPct,
    assumptions.yieldMode,
    assumptions.cashflowSettings.subtractReserves,
    assumptions.cashflowSettings.subtractNonAllocable,
    assumptions.cashflowSettings.subtractVacancy,
    assumptions.ekReturnSettings.includeTilgung,
  ]);

  async function handleSave() {
    if (!name.trim()) {
      setError(t("add.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWishlistProperty(id, buildDraft());
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
      <TopBar title={t("editTitle")} subtitle={name} locale={locale} />

      <div className="flex-1 p-6 flex flex-col gap-6 overflow-auto max-w-3xl w-full mx-auto">
        <div>
          <Link
            href={`/${locale}/wishlist`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("backToList")}
          </Link>
        </div>

        {/* Live KPIs */}
        <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label={t("columns.pricePerSqm")} value={fmtCurrency(previewKpis.pricePerSqm)} />
          <Kpi
            label={
              assumptions.yieldMode === "netto"
                ? t("columns.netYield")
                : t("columns.grossYield")
            }
            value={fmtPct(previewKpis.mietrendite)}
          />
          <Kpi
            label={t("columns.cashflow")}
            value={fmtCurrency(previewKpis.monthlyCashFlow)}
            tone={
              previewKpis.monthlyCashFlow == null
                ? undefined
                : previewKpis.monthlyCashFlow >= 0
                ? "positive"
                : "negative"
            }
          />
          <Kpi label={t("columns.ekReturn")} value={fmtPct(previewKpis.ekRendite)} />
        </div>

        <Section title={t("sections.identification")}>
          <FormField label={t("add.name") + " *"}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label={t("add.address")}>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <FormField label={t("add.exposeUrl")}>
            <Input
              value={exposeUrl}
              onChange={(e) => setExposeUrl(e.target.value)}
              placeholder="https://www.immobilienscout24.de/expose/..."
            />
          </FormField>
          <FormField label={t("fields.lage")}>
            <select
              value={lage}
              onChange={(e) => setLage(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none w-32"
            >
              <option value="">—</option>
              {LAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </FormField>
        </Section>

        <Section title={t("sections.basics")}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("add.price") + " (€)"}>
              <Input
                type="number"
                value={kaufpreis}
                onChange={(e) => setKaufpreis(e.target.value)}
              />
            </FormField>
            <FormField label={t("add.area") + " (m²)"}>
              <Input
                type="number"
                value={wohnflaeche}
                onChange={(e) => setWohnflaeche(e.target.value)}
              />
            </FormField>
            <FormField label={t("fields.rooms")}>
              <Input type="number" value={zimmer} onChange={(e) => setZimmer(e.target.value)} />
            </FormField>
            <FormField label={t("fields.yearBuilt")}>
              <Input
                type="number"
                value={baujahr}
                onChange={(e) => setBaujahr(e.target.value)}
              />
            </FormField>
          </div>
        </Section>

        <Section title={t("sections.financials")}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("add.rent") + " (€/Monat)"}>
              <Input
                type="number"
                value={kaltmiete}
                onChange={(e) => setKaltmiete(e.target.value)}
              />
            </FormField>
            <FormField label={t("add.equity") + " (€)"}>
              <Input
                type="number"
                value={eigenanteil}
                onChange={(e) => setEigenanteil(e.target.value)}
                placeholder={t("fields.equityPlaceholder", {
                  pct: assumptions.defaultEigenanteilPct,
                })}
              />
            </FormField>
            <FormField label={t("fields.nebenkostenPct")}>
              <Input
                type="number"
                value={nebenkostenPct}
                onChange={(e) => setNebenkostenPct(e.target.value)}
              />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("fields.globalAssumptionsHint")}
          </p>
        </Section>

        <Section title={t("sections.notes")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
            placeholder={t("fields.notesPlaceholder")}
          />
        </Section>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pb-6">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-semibold tabular-nums",
          tone === "positive" && "text-amber-400",
          tone === "negative" && "text-red-400",
          !tone && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return formatCurrency(v, "de-DE", Math.abs(v) >= 10_000);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  return formatPercent(v);
}
