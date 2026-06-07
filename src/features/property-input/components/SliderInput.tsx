"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  unitPosition?: "prefix" | "suffix";
  formatDisplay?: (v: number) => string;
  /** Optional explanation shown via an (i) tooltip next to the label. */
  info?: string;
  className?: string;
};

export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  unitPosition = "suffix",
  formatDisplay,
  info,
  className,
}: Props) {
  // Local string state allows free typing without immediate clamping
  const [inputStr, setInputStr] = useState(String(value));

  // Sync when value changes externally (e.g. slider drag)
  useEffect(() => {
    setInputStr(String(value));
  }, [value]);

  function commitInput(raw: string) {
    const v = parseFloat(raw);
    if (!isNaN(v)) {
      const clamped = Math.min(max, Math.max(min, v));
      onChange(clamped);
      setInputStr(String(clamped));
    } else {
      // Reset to last valid value
      setInputStr(String(value));
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-muted-foreground">{label}</label>
          {info && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-muted-foreground/60 hover:text-muted-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <TooltipContent side="top" className="max-w-[260px] text-left leading-snug">
                {info}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unit && unitPosition === "prefix" && (
            <span className="text-xs text-muted-foreground">{unit}</span>
          )}
          <Input
            type="number"
            value={inputStr}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              setInputStr(e.target.value);
              // Propagate valid in-range values immediately (updates slider)
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) {
                onChange(v);
              }
            }}
            onBlur={(e) => commitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInput((e.target as HTMLInputElement).value);
            }}
            className="w-24 h-7 text-right text-sm bg-muted/50 border-border focus-visible:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && unitPosition === "suffix" && (
            <span className="text-xs text-muted-foreground w-6">{unit}</span>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          const val = Array.isArray(v) ? v[0] : (v as number);
          onChange(val);
        }}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>
          {unit && unitPosition === "prefix" ? unit : ""}
          {min}
          {unit && unitPosition === "suffix" ? unit : ""}
        </span>
        <span>
          {unit && unitPosition === "prefix" ? unit : ""}
          {max}
          {unit && unitPosition === "suffix" ? unit : ""}
        </span>
      </div>
    </div>
  );
}
