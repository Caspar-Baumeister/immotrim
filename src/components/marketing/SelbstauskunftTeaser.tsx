import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Check,
  Download,
  FileCheck2,
  FileText,
  Sparkles,
} from "lucide-react";

// Landing section for the bank-report / Selbstauskunft funnel. Explains that
// Immotrim reads the uploaded documents and produces a clean Selbstauskunft,
// with a looping upload → AI → PDF animation, an example-PDF download, and a
// CTA into the dedicated /selbstauskunft landing.
export async function SelbstauskunftTeaser({ locale }: { locale: string }) {
  const t = await getTranslations("landing");

  const docs = [t("bankreport.doc1"), t("bankreport.doc2"), t("bankreport.doc3")];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Copy + CTAs */}
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400/80">
            {t("bankreport.eyebrow")}
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
            {t("bankreport.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-xl">
            {t("bankreport.subtitle")}
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Link
              href={`/${locale}/selbstauskunft`}
              className="inline-flex w-fit items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {t("bankreport.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="/beispiel-selbstauskunft.pdf"
              download
              className="inline-flex w-fit items-center justify-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-4 py-2.5 transition-colors"
            >
              <Download className="h-4 w-4" />
              {t("bankreport.download")}
            </a>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-amber-500" />
            {t("bankreport.note")}
          </p>
        </div>

        {/* Upload → AI → PDF animation */}
        <div className="immotrim-anim rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 sm:gap-5">
            {/* Documents flying in */}
            <div className="flex flex-col gap-2">
              {docs.map((doc, i) => (
                <div
                  key={doc}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-muted-foreground [animation:immotrim-float_3s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span className="whitespace-nowrap">{doc}</span>
                </div>
              ))}
            </div>

            {/* Flow track */}
            <div className="relative h-px flex-1 bg-border">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-500 [animation:immotrim-flow-dot_2.4s_linear_infinite]"
                  style={{ animationDelay: `${i * 0.8}s` }}
                />
              ))}
            </div>

            {/* AI engine + progress */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                <Sparkles className="h-6 w-6 text-amber-500 [animation:immotrim-float_2.5s_ease-in-out_infinite]" />
              </div>
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-amber-500 [animation:immotrim-progress_4s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Flow track */}
            <div className="relative h-px flex-1 bg-border">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-500 [animation:immotrim-flow-dot_2.4s_linear_infinite]"
                  style={{ animationDelay: `${1.2 + i * 0.8}s` }}
                />
              ))}
            </div>

            {/* Finished PDF */}
            <div className="flex flex-col items-center gap-2 [animation:immotrim-result-pop_4s_ease-in-out_infinite]">
              <div className="flex h-16 w-12 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 shadow-sm">
                <FileCheck2 className="h-6 w-6 text-emerald-500" />
              </div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                PDF
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t("bankreport.animUpload")}</span>
            <span>{t("bankreport.animProcess")}</span>
            <span>{t("bankreport.animResult")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
