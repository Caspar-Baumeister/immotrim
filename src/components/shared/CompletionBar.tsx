import { cn } from "@/lib/utils";

// Shared "how full is this" meter — used in the sidebar nav, the section page
// headers and the bank tiles so completeness reads the same everywhere.
// Colour tracks the value: red → amber → brand violet → green (Pillio-style).

export function completionColor(value: number): string {
  if (value >= 100) return "#10b981"; // emerald — complete
  if (value >= 67) return "#6c5ce7"; // brand violet — nearly there
  if (value >= 34) return "#f59e0b"; // amber — in progress
  return "#ef4444"; // red — barely started
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function CompletionBar({
  value,
  className,
  height = "h-1.5",
}: {
  /** 0–100. */
  value: number;
  className?: string;
  /** Tailwind height class for the track (default h-1.5). */
  height?: string;
}) {
  const v = clamp(value);
  return (
    <div
      className={cn(
        "w-full rounded-full bg-muted overflow-hidden",
        height,
        className,
      )}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${v}%`, backgroundColor: completionColor(v) }}
      />
    </div>
  );
}
