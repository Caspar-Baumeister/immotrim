import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";

// Static, non-interactive marketing demo of the Portfolio-Assistent. It mirrors
// the visual language of src/features/portfolio-chat/* (chat bubbles + the amber
// "Vorgeschlagene Änderung" card) but is intentionally hard-coded and always dark,
// independent of the site theme, so it reads as a product screenshot.
export async function AiShowcase({ locale }: { locale: string }) {
  const t = await getTranslations("landing");

  const breakdown = [
    { label: t("ai.a1Tilgung"), value: t("ai.a1TilgungVal") },
    { label: t("ai.a1Cashflow"), value: t("ai.a1CashflowVal") },
    { label: t("ai.a1Wert"), value: t("ai.a1WertVal") },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Copy */}
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400/80">
            {t("ai.eyebrow")}
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
            {t("ai.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-xl">
            {t("ai.subtitle")}
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <Link
              href={`/${locale}/signup`}
              className="inline-flex w-fit items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {t("ai.cta")}
            </Link>
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-amber-500" />
              {t("ai.confirmNote")}
            </p>
          </div>
        </div>

        {/* Chat mock — always dark, framed like the product panel */}
        <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-xl shadow-black/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 h-12 px-4 border-b border-white/10">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="font-heading text-sm font-medium text-zinc-100">
              Portfolio-Assistent
            </span>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-4 p-4">
            {/* Exchange 1 */}
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm bg-white px-3 py-2 text-sm text-black">
                {t("ai.q1")}
              </div>
            </div>
            <div className="max-w-[92%] space-y-2 text-sm leading-relaxed text-zinc-200">
              <p>
                {t("ai.a1Lead")}{" "}
                <span className="font-semibold text-white">{t("ai.a1Total")}</span>{" "}
                {t("ai.a1Sub")}
              </p>
              <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                {breakdown.map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-zinc-400">{row.label}</span>
                    <span className="font-medium tabular-nums text-zinc-100">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exchange 2 */}
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm bg-white px-3 py-2 text-sm text-black">
                {t("ai.q2")}
              </div>
            </div>
            <div className="flex max-w-[92%] flex-col gap-2 text-sm leading-relaxed text-zinc-200">
              <p>{t("ai.a2")}</p>

              {/* Vorgeschlagene Änderung card (static replica of ChangeProposalCard) */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20 bg-amber-500/[0.06]">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">
                    {t("ai.proposalTitle")}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex flex-col gap-1.5">
                  <div className="text-xs text-zinc-400 truncate">
                    {t("ai.proposalProperty")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-36 shrink-0 truncate">
                      {t("ai.proposalField")}
                    </span>
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs text-zinc-500 tabular-nums truncate">
                        {t("ai.proposalOld")}
                      </span>
                      <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />
                      <span className="text-xs font-semibold text-white tabular-nums truncate">
                        {t("ai.proposalNew")}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-500/20">
                  <span className="inline-flex items-center justify-center rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black">
                    {t("ai.proposalApply")}
                  </span>
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300">
                    <X className="h-3.5 w-3.5" />
                    {t("ai.proposalCancel")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
