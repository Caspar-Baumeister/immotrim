"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

// Horizontally scrollable primary nav for small screens, where the left Sidebar
// is hidden. Shows the same destinations without the completion bars.
export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="md:hidden flex items-center gap-1 overflow-x-auto border-b border-border bg-card/80 backdrop-blur px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs transition-colors",
              isActive(item.href)
                ? "bg-foreground/10 text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
