"use client";

import { useEffect, useState } from "react";
import { Globe, Building2, Info, LineChart, User, LogOut, CreditCard } from "lucide-react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  locale: string;
  userEmail?: string | null;
};

export function TopBar({ title, subtitle, stats, locale, userEmail: userEmailProp = null }: Props) {
  const t = useTranslations("nav");
  const tAccount = useTranslations("account");
  const router = useRouter();
  const pathname = usePathname();
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

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(/^\/(en|de)/, `/${newLocale}`);
    router.push(newPath);
  };

  const isActive = (segment: string) => pathname.includes(segment);

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center px-3 sm:px-5 gap-2 sm:gap-4 flex-shrink-0">
      {/* Logo */}
      <Link href={`/${locale}/portfolio`} className="flex items-center gap-2 flex-shrink-0">
        <Image
          src="/logo_immotrim.png"
          alt="Immotrim"
          width={100}
          height={28}
          className="h-6 sm:h-7 w-auto object-contain"
          priority
        />
        <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
          IMMOTRIM
        </span>
      </Link>

      {/* Nav separator */}
      <div className="w-px h-5 bg-border flex-shrink-0 hidden sm:block" />

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        <NavLink
          href={`/${locale}/portfolio`}
          label={t("portfolio")}
          icon={<Building2 className="h-3.5 w-3.5" />}
          active={isActive("/portfolio")}
        />
        <NavLink
          href={`/${locale}/wishlist`}
          label={t("wishlist")}
          icon={<LineChart className="h-3.5 w-3.5" />}
          active={isActive("/wishlist")}
        />
      </nav>

      {/* Page title (shown only on property insight pages) */}
      {title && (
        <>
          <div className="w-px h-5 bg-border flex-shrink-0 hidden md:block" />
          <div className="hidden md:flex items-baseline gap-2 min-w-0 flex-1">
            <span className="text-sm font-semibold text-foreground truncate">{title}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
            )}
          </div>
        </>
      )}

      {/* Spacer: always keeps the right-side controls pushed right.
          The title block above carries flex-1 at md+, so on mobile (where it's
          hidden) this spacer grows instead. When there's no title, it grows at all sizes. */}
      {title ? <div className="flex-1 md:hidden" /> : <div className="flex-1" />}

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

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Language switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs px-2 py-1.5 rounded-lg hover:bg-foreground/5 flex-shrink-0">
          <Globe className="h-3.5 w-3.5" />
          <span className="uppercase font-medium hidden sm:inline">{locale}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-popover border-border min-w-[100px]"
        >
          <DropdownMenuItem
            onClick={() => switchLocale("en")}
            className={cn("cursor-pointer text-sm", locale === "en" && "text-amber-400")}
          >
            🇬🇧 English
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => switchLocale("de")}
            className={cn("cursor-pointer text-sm", locale === "de" && "text-amber-400")}
          >
            🇩🇪 Deutsch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            onClick={() => router.push(`/${locale}/account`)}
            className="cursor-pointer text-sm gap-2"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {tAccount("title")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await getSupabaseBrowserClient().auth.signOut();
              router.push(`/${locale}`);
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

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-foreground/10 text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
