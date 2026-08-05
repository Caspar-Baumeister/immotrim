"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CompletionBar } from "@/components/shared/CompletionBar";
import { useCompletion } from "@/features/profile/completion-context";
import { NAV_ITEMS, type NavItemDef } from "./nav-items";

// Persistent left navigation for the (app) shell. Renders the six menu points;
// the four "Unterlagen" points show a completion bar fed by the live completion
// context (seeded server-side, updated as the user edits a section form).
export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const completion = useCompletion();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const top = NAV_ITEMS.filter((i) => !i.group);
  const dashboard = top.find((i) => i.href === "/dashboard");
  const banken = top.find((i) => i.href === "/banken");
  const unterlagen = NAV_ITEMS.filter((i) => i.group === "unterlagen");

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logo_immotrim.svg"
            alt="Immotrim"
            width={32}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="text-xl font-bold uppercase tracking-wide text-foreground font-heading">
            IMMOTRIM
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {dashboard && (
          <NavItem
            item={dashboard}
            label={t(dashboard.labelKey)}
            active={isActive(dashboard.href)}
          />
        )}

        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t("unterlagen")}
        </p>
        {unterlagen.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            label={t(item.labelKey)}
            active={isActive(item.href)}
            completion={item.section ? completion[item.section] : undefined}
          />
        ))}

        <div className="my-3 h-px bg-sidebar-border" />
        {banken && (
          <NavItem
            item={banken}
            label={t(banken.labelKey)}
            active={isActive(banken.href)}
          />
        )}
      </nav>

      <div className="px-5 py-3 border-t border-sidebar-border">
        <p className="text-[10px] text-muted-foreground/50">Immotrim v1.0</p>
      </div>
    </aside>
  );
}

function NavItem({
  item,
  label,
  active,
  completion,
}: {
  item: NavItemDef;
  label: string;
  active: boolean;
  completion?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {completion !== undefined && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {Math.round(completion)}%
          </span>
        )}
      </span>
      {completion !== undefined && <CompletionBar value={completion} height="h-1" />}
    </Link>
  );
}
