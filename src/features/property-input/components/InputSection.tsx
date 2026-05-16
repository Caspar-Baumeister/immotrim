"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function InputSection({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors text-left">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-2 bg-card flex flex-col gap-5 border-t border-border">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
