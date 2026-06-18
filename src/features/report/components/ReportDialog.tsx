"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, FileText, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Property } from "@/lib/supabase";
import type { PortfolioProperty } from "@/features/portfolio/calculations";
import {
  MAX_DETAIL_PROPERTIES,
  defaultReportConfig,
  type ReportConfig,
} from "../report-types";
import {
  missingReportFieldLabels,
  rankPropertiesForReport,
} from "../report-metrics";
import { listReportImages, type ReportImage } from "../report-images-service";
import { ReportImageUploader } from "./ReportImageUploader";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  locale: string;
};

// Small inline switch, matching the property form's toggle look.
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-8 h-4.5 rounded-full transition-colors duration-200 shrink-0",
        checked ? "bg-amber-500" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200",
          checked ? "left-4" : "left-0.5"
        )}
      />
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

export function ReportDialog({ open, onOpenChange, properties, locale }: Props) {
  const portfolioProps: PortfolioProperty[] = useMemo(
    () =>
      properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        inputs: p.inputs,
      })),
    [properties]
  );

  const hasTaxData = properties.some((p) => !!p.inputs.tax);
  const overLimit = properties.length > MAX_DETAIL_PROPERTIES;

  const [config, setConfig] = useState<ReportConfig>(() =>
    defaultReportConfig([])
  );
  const [images, setImages] = useState<ReportImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Investor name shown on the cover. Prefilled from the profile (user_metadata);
  // if absent we never fall back to the email — the user must supply a name.
  const [investorName, setInvestorName] = useState("");
  // The name as currently stored in the profile, so we only write on a real change.
  const [storedName, setStoredName] = useState("");

  const refreshImages = () => {
    listReportImages().then(setImages);
  };

  // Initialise selection + load images whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const initialSelection = overLimit
      ? rankPropertiesForReport(portfolioProps)
      : properties.map((p) => p.id);
    setConfig({
      ...defaultReportConfig(initialSelection),
      includeTax: hasTaxData,
    });
    setError(null);
    refreshImages();
    getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        const meta = data.user?.user_metadata ?? {};
        const stored = ((meta.full_name as string) || (meta.name as string) || "").trim();
        setInvestorName(stored);
        setStoredName(stored);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setToggle = (key: keyof ReportConfig, value: boolean) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const selected = config.selectedPropertyIds;
  const toggleProperty = (id: string) => {
    setConfig((c) => {
      const has = c.selectedPropertyIds.includes(id);
      if (has) {
        return {
          ...c,
          selectedPropertyIds: c.selectedPropertyIds.filter((x) => x !== id),
        };
      }
      if (c.selectedPropertyIds.length >= MAX_DETAIL_PROPERTIES) return c;
      return { ...c, selectedPropertyIds: [...c.selectedPropertyIds, id] };
    });
  };

  const suggestTop = () =>
    setConfig((c) => ({
      ...c,
      selectedPropertyIds: rankPropertiesForReport(portfolioProps),
    }));

  const trimmedName = investorName.trim();

  const handleGenerate = async () => {
    if (!trimmedName) {
      setError("Bitte gib deinen Namen an, bevor du den Bericht erstellst.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Persist the name to the profile so it prefills next time (and never has to
      // be re-entered). Best-effort — a failed save shouldn't block the report.
      if (trimmedName !== storedName) {
        await getSupabaseBrowserClient().auth.updateUser({
          data: { full_name: trimmedName },
        });
      }
      const response = await fetch(`/api/portfolio/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, config, investorName: trimmedName }),
      });
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Portfolio-Finanzierungsbericht.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch {
      setError(
        "Der Bericht konnte nicht erstellt werden. Bitte versuche es erneut."
      );
    } finally {
      setGenerating(false);
    }
  };

  const titleImages = images.filter((i) => i.scope === "title");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-500" />
            Bankbericht erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellt einen bankfertigen Portfolio-Finanzierungsbericht (PDF) auf
            Basis deiner eingegebenen Daten.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 min-w-0">
          {/* ── Eigentümer / Investor ────────────────────────────────────── */}
          <section className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eigentümer / Investor
            </Label>
            <Input
              value={investorName}
              onChange={(e) => setInvestorName(e.target.value)}
              placeholder="Vor- und Nachname"
              className="bg-card border-border focus-visible:ring-1"
            />
            {!trimmedName && (
              <p className="text-[11px] text-amber-600/90 dark:text-amber-500/80">
                Bitte gib deinen Namen an — er erscheint auf dem Deckblatt des Berichts.
              </p>
            )}
          </section>

          {/* ── Inhalte ──────────────────────────────────────────────────── */}
          <section className="flex flex-col">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Inhalte
            </h4>
            <div className="divide-y divide-border/50">
              <ToggleRow
                label="Portfolio-Grafiken"
                hint="Entwicklung von Wert, Schulden, Cashflow und Risiko über Zeit"
                checked={config.includeCharts}
                onChange={(v) => setToggle("includeCharts", v)}
              />
              <ToggleRow
                label="Finanzierungsdetails"
                hint="Zinssatz, Tilgung, Zinsbindung & Kapitaldienst je Objekt"
                checked={config.includeFinancing}
                onChange={(v) => setToggle("includeFinancing", v)}
              />
              {hasTaxData && (
                <ToggleRow
                  label="Steuerkennzahlen"
                  hint="Cashflow nach Steuern & steuerliche Kennzahlen"
                  checked={config.includeTax}
                  onChange={(v) => setToggle("includeTax", v)}
                />
              )}
              <ToggleRow
                label="Notizen / Kommentare"
                hint="Pro Objekt erfasste Notizen auf den Detailseiten"
                checked={config.includeNotes}
                onChange={(v) => setToggle("includeNotes", v)}
              />
              <ToggleRow
                label="Objektbilder"
                hint="Bis zu zwei Bilder je Detailseite"
                checked={config.includePropertyImages}
                onChange={(v) => setToggle("includePropertyImages", v)}
              />
              <ToggleRow
                label="Titelbild auf dem Deckblatt"
                checked={config.includeTitleImage}
                onChange={(v) => setToggle("includeTitleImage", v)}
              />
            </div>
            {config.includeTitleImage && (
              <div className="mt-2">
                <ReportImageUploader
                  target={{ scope: "title" }}
                  images={titleImages}
                  max={1}
                  label="Titelbild"
                  onChanged={refreshImages}
                />
              </div>
            )}
          </section>

          {/* ── Detailseiten ─────────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detailseiten
              </h4>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {selected.length} / {MAX_DETAIL_PROPERTIES} ausgewählt
              </span>
            </div>

            {overLimit && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Die Portfolioübersicht und die Grafiken enthalten immer alle{" "}
                  {properties.length} Objekte. Für die ausführlichen Einzelseiten
                  können maximal {MAX_DETAIL_PROPERTIES} Objekte ausgewählt werden.
                  <button
                    type="button"
                    onClick={suggestTop}
                    className="ml-1 inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 font-medium"
                  >
                    <Sparkles className="h-3 w-3" />
                    Top {MAX_DETAIL_PROPERTIES} vorschlagen
                  </button>
                </p>
              </div>
            )}

            <div className="flex flex-col divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
              {properties.map((p) => {
                const isSelected = selected.includes(p.id);
                const missing = missingReportFieldLabels(p.inputs);
                const disabled =
                  !isSelected && selected.length >= MAX_DETAIL_PROPERTIES;
                const propImages = images.filter(
                  (i) => i.scope === "property" && i.property_id === p.id
                );
                return (
                  <div key={p.id} className="flex flex-col min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleProperty(p.id)}
                      disabled={disabled}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-left transition-colors min-w-0 w-full",
                        isSelected ? "bg-amber-500/[0.05]" : "hover:bg-muted/30",
                        disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-black"
                            : "border-border bg-background"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{p.name}</p>
                        {missing.length > 0 && (
                          <p className="text-[10px] text-amber-600/90 dark:text-amber-500/80 truncate">
                            Objektdetails unvollständig: {missing.join(", ")}
                          </p>
                        )}
                      </div>
                    </button>
                    {isSelected && config.includePropertyImages && (
                      <div className="px-3 pb-2.5 pl-10">
                        <ReportImageUploader
                          target={{ propertyId: p.id }}
                          images={propImages}
                          max={2}
                          label="Objektbilder"
                          onChanged={refreshImages}
                          compact
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Abbrechen
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || properties.length === 0 || !trimmedName}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1.5"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {generating ? "Bericht wird erstellt …" : "PDF erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
