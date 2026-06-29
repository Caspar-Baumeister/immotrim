"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_SHOWCASE_DATA as D } from "./chart-showcase-data";
import { VermoegensaufbauChart } from "@/features/wealth/components/VermoegensaufbauChart";
import { CashFlowChart } from "@/features/cash-flow/components/CashFlowChart";
import { AmortizationChart } from "@/features/mortgage/components/AmortizationChart";
import { EKRenditeChart } from "@/features/returns/components/EKRenditeChart";
import { WertSchuldenChart } from "@/features/appreciation/components/WertSchuldenChart";
import { MietrenditeChart } from "@/features/cap-rate/components/MietrenditeChart";

export type ShowcaseSlide = { title: string; what: string; why: string };

type Props = {
  slides: ShowcaseSlide[];
  /** aria-labels for the navigation controls. */
  labels: { prev: string; next: string; goto: string; whyLabel: string };
};

// Chart elements in display order, built at a responsive height. Captions are
// passed in (translated) and zipped with these by index.
function buildCharts(height: number): ReactNode[] {
  return [
    <VermoegensaufbauChart key="wealth" data={D.wealth} height={height} />,
    <CashFlowChart key="cashflow" data={D.cashFlow} height={height} />,
    <AmortizationChart key="amort" data={D.amortization} height={height} />,
    <EKRenditeChart
      key="ek"
      data={D.ekRendite}
      height={height}
      showEffectiveEigenkapital={false}
    />,
    <WertSchuldenChart key="wert" data={D.appreciation} height={height} />,
    <MietrenditeChart
      key="miete"
      data={D.mietrendite}
      baselineY1={D.mietrenditeBaseline}
      height={height}
    />,
  ];
}

export function ChartShowcase({ slides, labels }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", skipSnaps: false },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  // Match the portfolio's mobile treatment: wide-and-short charts on small
  // screens (so the x-axis isn't cramped), taller on desktop.
  const [chartHeight, setChartHeight] = useState(260);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setChartHeight(mq.matches ? 200 : 280);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const charts = useMemo(() => buildCharts(chartHeight), [chartHeight]);

  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setSnaps(emblaApi.scrollSnapList());
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, i) => (
            <div
              key={slide.title}
              className="min-w-0 shrink-0 grow-0 basis-[94%] sm:basis-[78%] lg:basis-[60%] pl-3 sm:pl-4"
            >
              <article className="h-full rounded-2xl border border-border bg-card p-4 sm:p-6 flex flex-col">
                <header className="space-y-1 mb-3">
                  <h3 className="font-heading text-base sm:text-lg font-semibold tracking-tight">
                    {slide.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{slide.what}</p>
                </header>
                <div>{charts[i]}</div>
                <p className="mt-auto pt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <span className="sr-only">{labels.whyLabel}: </span>
                    {slide.why}
                  </span>
                </p>
              </article>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      <button
        type="button"
        aria-label={labels.prev}
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur text-foreground hover:bg-background transition-colors shadow-sm"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label={labels.next}
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur text-foreground hover:bg-background transition-colors shadow-sm"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {snaps.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${labels.goto} ${i + 1}`}
            aria-current={i === selected}
            onClick={() => scrollTo(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === selected
                ? "w-6 bg-amber-500"
                : "w-2 bg-foreground/20 hover:bg-foreground/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}
