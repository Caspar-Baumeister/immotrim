"use client";

import { Info, User, LogOut, CreditCard, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { endSession } from "@/lib/firebase/client";
import { useAccount } from "@/features/account/account-context";
import { NAV_ITEMS } from "./nav-items";

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

// The app bar: logo and primary navigation side by side, then the page title
// where the navigation does not already say it, optional stat chips, plan and
// user menu.
export function TopBar({ title, subtitle, stats, userEmail: userEmailProp = null }: Props) {
  const tAccount = useTranslations("account");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const account = useAccount();
  const userEmail = userEmailProp ?? account.email;

  const under = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const navLabels = NAV_ITEMS.map((item) => tNav(item.labelKey));
  const pageTitle = title && !navLabels.includes(title) ? title : null;

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 border-b border-border bg-card/90 backdrop-blur">
      <div className="h-14 flex items-center px-3 sm:px-6 gap-1 sm:gap-2">
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0 mr-1 sm:mr-4">
          <Image src="/logo_immotrim.svg" alt="Immotrim" width={28} height={28} className="h-7 w-auto object-contain" priority />
          <span className="hidden lg:inline text-lg font-bold uppercase tracking-wide text-foreground font-heading">IMMOTRIM</span>
        </Link>

        <nav className="flex items-center gap-1 flex-shrink-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = under(item.href) || (item.also ?? []).some(under);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-foreground/[0.07] text-foreground font-medium"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tNav(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Page title */}
        {pageTitle ? (
          <div className="hidden md:flex items-baseline gap-2 min-w-0 flex-1 ml-3 pl-4 border-l border-border">
            <span className="text-sm font-semibold text-foreground truncate">{pageTitle}</span>
            {subtitle && <span className="hidden xl:inline text-xs text-muted-foreground truncate">{subtitle}</span>}
          </div>
        ) : (
          <div className="hidden md:block flex-1" />
        )}
        <div className="flex-1 md:hidden" />

      {/* Stat chips */}
      {stats && stats.length > 0 && (
        <div className="hidden xl:flex items-center gap-2">
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

      {account.plus ? (
        <span className="hidden sm:inline px-2 text-xs text-muted-foreground whitespace-nowrap">Immotrim Plus</span>
      ) : (
        <Link
          href="/pricing"
          aria-label={tNav("upgrade")}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium text-[#6c5ce7] hover:bg-[#6c5ce7]/10 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">{tNav("upgrade")}</span>
        </Link>
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
              await endSession();
              window.location.assign("/");
            }}
            className="cursor-pointer text-sm gap-2 text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            {tAccount("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {/* Below md the title gets its own row, the bar is full with the navigation. */}
      {pageTitle && (
        <div className="md:hidden flex items-baseline gap-2 border-t border-border px-3 py-2 sm:px-6">
          <span className="text-sm font-semibold text-foreground truncate">{pageTitle}</span>
          {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
        </div>
      )}
    </header>
  );
}
