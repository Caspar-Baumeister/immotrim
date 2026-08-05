import { CompletionBar } from "@/components/shared/CompletionBar";

// Shared header for the Unterlagen pages (Haushaltsrechnung, Stammdaten,
// Immobilien, Strategie): title + description, a completion meter, and an
// optional help/explanation block ("was soll ich hochladen").
export function SectionHeader({
  title,
  description,
  completion,
  help,
}: {
  title: string;
  description?: string;
  completion?: number;
  help?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold font-heading text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {completion !== undefined && (
          <div className="w-44 flex flex-col gap-1.5 flex-shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Vollständigkeit</span>
              <span className="tabular-nums font-semibold text-foreground">
                {Math.round(completion)}%
              </span>
            </div>
            <CompletionBar value={completion} height="h-2" />
          </div>
        )}
      </div>
      {help && (
        <div className="rounded-xl border border-[#6c5ce7]/20 bg-[#6c5ce7]/[0.03] px-4 py-3 text-sm text-muted-foreground leading-relaxed">
          {help}
        </div>
      )}
    </div>
  );
}
