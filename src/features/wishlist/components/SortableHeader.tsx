"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Direction = "asc" | "desc";

type Props = {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: Direction;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
};

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
  className,
}: Props) {
  const active = activeKey === sortKey;
  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          align === "right" && "flex-row-reverse",
          active ? "text-amber-400" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span>{label}</span>
        {!active && <ChevronsUpDown className="h-3 w-3 opacity-60" />}
        {active && direction === "asc" && <ChevronUp className="h-3 w-3" />}
        {active && direction === "desc" && <ChevronDown className="h-3 w-3" />}
      </button>
    </TableHead>
  );
}
