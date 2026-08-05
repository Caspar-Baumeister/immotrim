"use client";

import { useEffect, useState } from "react";
import { Info, User, LogOut, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type StatChip = {
  label: string;
  value: string;
  positive?: boolean;
  tooltip?: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  stats?: StatChip[];
  userEmail?: string | null;
};

// Slim per-page header inside the app shell. The Sidebar owns branding + primary
// navigation; this bar carries the page title, optional stat chips and the user
// menu.
export function TopBar({ title, subtitle, stats, userEmail: userEmailProp = null }: Props) {
  const tAccount = useTranslations("account");
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(userEmailProp);

  // If parent didn't pass userEmail, fetch lazily from the browser session.
  useEffect(() => {
    if (userEmailProp !== null) return;
    let cancelled = false;
    getSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      if (!cancelled) setUserEmail(data.user?.email ?? null);
    });
    return () => { cancelled = true; };
  }, [userEmailProp]);

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center px-3 sm:px-5 gap-2 sm:gap-4 flex-shrink-0">
      {/* Page title */}
      {title ? (
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground truncate">{title}</span>
          {subtitle && (
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Stat chips */}
      {stats && stats.length > 0 && (
        <div className="hidden lg:flex items-center gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5"
            >
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  stat.positive === true
                    ? "text-emerald-400"
                    : stat.positive === false
                    ? "text-red-400"
                    : "text-foreground"
                )}
              >
                {stat.value}
              </span>
              {stat.tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="inline-flex">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-default flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-center leading-snug">
                      {stat.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ))}
        </div>
      )}

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs px-2 py-1.5 rounded-lg hover:bg-foreground/5 flex-shrink-0">
          <User className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-popover border-border min-w-[200px]"
        >
          {userEmail && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                {userEmail}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => router.push(`/account`)}
            className="cursor-pointer text-sm gap-2"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {tAccount("title")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await getSupabaseBrowserClient().auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="cursor-pointer text-sm gap-2 text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            {tAccount("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
