import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  "A++": "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "A+": "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  A: "bg-green-500/10 text-green-300 ring-green-500/25",
  "B+": "bg-blue-500/10 text-blue-300 ring-blue-500/25",
  B: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  "B-": "bg-amber-500/10 text-amber-300 ring-amber-500/25",
  "C+": "bg-orange-500/10 text-orange-300 ring-orange-500/25",
  C: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  D: "bg-red-500/10 text-red-300 ring-red-500/25",
};

export function LageBadge({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  const tone = TONE[value] ?? "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[2.5rem] rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1",
        tone
      )}
    >
      {value}
    </span>
  );
}
