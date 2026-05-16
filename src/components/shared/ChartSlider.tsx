"use client";

import { Slider } from "@/components/ui/slider";

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

export function ChartSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = "%",
}: Props) {
  return (
    <div className="flex items-center gap-3 px-0.5">
      <span className="text-[10px] text-muted-foreground shrink-0 w-28 leading-tight">
        {label}
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          const val = Array.isArray(v) ? v[0] : (v as number);
          onChange(val);
        }}
        className="flex-1"
      />
      <span className="text-[10px] font-semibold tabular-nums text-amber-400 shrink-0 w-10 text-right">
        {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        {unit}
      </span>
    </div>
  );
}
