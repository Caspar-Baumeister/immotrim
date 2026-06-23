"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { applyPortfolioChange } from "@/lib/portfolio-chat/actions";
import type { ChangeProposal } from "./types";
import type { FieldUnit } from "@/lib/portfolio-chat/fields";

function formatByUnit(unit: FieldUnit, value: number | null, yearsLabel: string): string {
  if (value === null) return "—";
  switch (unit) {
    case "euro":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value, value % 1 === 0 ? 0 : 2);
    case "years":
      return `${value} ${yearsLabel}`;
    default:
      return String(value);
  }
}

type CardStatus = "pending" | "applying" | "applied" | "dismissed" | "failed";

// Confirmation card for an assistant-proposed change. Mirrors the visual language
// of ExtractionReviewPanel (amber accent, old→new diff). Apply calls the trusted
// applyPortfolioChange server action; the model never writes directly.
export function ChangeProposalCard({
  proposal,
  onApplied,
}: {
  proposal: ChangeProposal;
  onApplied?: () => void;
}) {
  const t = useTranslations("portfolioChat");
  const [state, setState] = useState<CardStatus>("pending");

  const label = t(`fields.${proposal.field}`);
  const yearsLabel = t("units.years");
  const oldStr = formatByUnit(proposal.unit, proposal.oldValue, yearsLabel);
  const newStr = formatByUnit(proposal.unit, proposal.newValue, yearsLabel);

  const apply = async () => {
    setState("applying");
    try {
      const res = await applyPortfolioChange({
        propertyId: proposal.propertyId,
        field: proposal.field,
        newValue: proposal.newValue,
      });
      if (res.ok) {
        setState("applied");
        onApplied?.();
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20 bg-amber-500/[0.06]">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">{t("proposal.title")}</span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        <div className="text-xs text-muted-foreground truncate">{proposal.propertyName}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-36 shrink-0 truncate">{label}</span>
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-muted-foreground/70 tabular-nums truncate">{oldStr}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="text-xs font-semibold text-foreground tabular-nums truncate">{newStr}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-500/20">
        {state === "applied" ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> {t("proposal.applied")}
          </span>
        ) : state === "dismissed" ? (
          <span className="text-xs text-muted-foreground">{t("proposal.dismissed")}</span>
        ) : (
          <>
            <Button
              size="sm"
              onClick={apply}
              disabled={state === "applying"}
              className="bg-amber-500 hover:bg-amber-400 text-black"
            >
              {state === "applying" ? t("proposal.applying") : t("proposal.apply")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setState("dismissed")}
              disabled={state === "applying"}
            >
              <X className="h-3.5 w-3.5" />
              {t("proposal.cancel")}
            </Button>
            {state === "failed" && (
              <span className="text-xs text-red-400 ml-auto">{t("proposal.failed")}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
