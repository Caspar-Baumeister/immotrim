import { getTranslations } from "next-intl/server";
import { FileText, Upload } from "lucide-react";

// Landing "How it works" section. Two step cards, each with a looping
// CSS-only illustration (same recipe as SelbstauskunftTeaser: Tailwind
// arbitrary [animation:...] utilities driven by @keyframes in globals.css,
// wrapped in .immotrim-anim for the shared prefers-reduced-motion guard)
// instead of static step screenshots.
export async function HowItWorksSteps() {
  const t = await getTranslations("landing");

  const docs = [t("bankreport.doc1"), t("bankreport.doc2"), t("bankreport.doc3")];
  const bars = [45, 70, 55, 90, 65];

  const steps = [
    { title: t("steps.s1Title"), desc: t("steps.s1Desc") },
    { title: t("steps.s2Title"), desc: t("steps.s2Desc") },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 space-y-14">
      <div className="text-center space-y-3">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">{t("steps.title")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("steps.subtitle")}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
        {steps.map(({ title, desc }, i) => (
          <div key={title} className="relative rounded-2xl border border-border bg-card flex flex-col">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="hidden sm:flex absolute -right-5 top-[30%] z-10 h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-amber-500"
              >
                →
              </span>
            )}

            {i === 0 ? (
              /* Step 1 — files rising into an upload dropzone */
              <div className="immotrim-anim relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-t-2xl border-b border-border bg-gradient-to-b from-muted to-background">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/10">
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl border-2 border-amber-500/30 [animation:immotrim-pulse-ring_2.4s_ease-out_infinite]"
                  />
                  <Upload className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  {docs.map((doc, j) => (
                    <div
                      key={doc}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-2 py-1 text-[10px] text-muted-foreground [animation:immotrim-upload-chip_2.4s_ease-in-out_infinite]"
                      style={{ animationDelay: `${j * 0.5}s` }}
                    >
                      <FileText className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="whitespace-nowrap">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Step 2 — numbers and graphs animating in */
              <div className="immotrim-anim relative flex aspect-[4/3] w-full flex-col justify-center gap-3 overflow-hidden rounded-t-2xl border-b border-border bg-gradient-to-b from-muted to-background p-5">
                <div className="flex h-12 items-end gap-1.5">
                  {bars.map((h, j) => (
                    <div
                      key={j}
                      className="w-3 flex-1 origin-bottom rounded-t-sm bg-amber-500/70 [animation:immotrim-bar-grow_2.6s_ease-in-out_infinite]"
                      style={{ height: `${h}%`, animationDelay: `${j * 0.15}s` }}
                    />
                  ))}
                </div>
                <svg viewBox="0 0 100 32" className="h-8 w-full overflow-visible" preserveAspectRatio="none">
                  <polyline
                    points="0,26 20,20 40,22 60,10 80,14 100,4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-500 [animation:immotrim-draw-line_3s_ease-in-out_infinite]"
                    style={{ strokeDasharray: 110, strokeDashoffset: 110 }}
                  />
                </svg>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="rounded-lg border border-border bg-background/70 px-2.5 py-1.5 [animation:immotrim-result-pop_3.2s_ease-in-out_infinite]"
                  >
                    <div className="text-[9px] uppercase text-muted-foreground">Cashflow</div>
                    <div className="text-sm font-semibold tabular-nums text-emerald-500">+€420</div>
                  </div>
                  <div
                    className="rounded-lg border border-border bg-background/70 px-2.5 py-1.5 [animation:immotrim-result-pop_3.2s_ease-in-out_infinite]"
                    style={{ animationDelay: "0.6s" }}
                  >
                    <div className="text-[9px] uppercase text-muted-foreground">Rendite</div>
                    <div className="text-sm font-semibold tabular-nums text-amber-500">4.8%</div>
                  </div>
                </div>
              </div>
            )}

            <div className="relative p-6 lg:p-8 pt-10 space-y-3 flex-1">
              <div className="absolute -top-5 left-6 lg:left-8 w-10 h-10 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center shadow-md ring-4 ring-card">
                {i + 1}
              </div>
              <h3 className="font-heading text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
