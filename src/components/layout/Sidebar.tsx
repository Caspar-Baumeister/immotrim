"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/features/account/account-context";
import { NAV_ITEMS, type NavItemDef } from "./nav-items";

// Persistent left navigation for the (app) shell.
export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { plus } = useAccount();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

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
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            label={t(item.labelKey)}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border">
        {plus ? (
          <p className="px-2 text-xs text-muted-foreground">Immotrim Plus</p>
        ) : (
          <Link
            href="/pricing"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#6c5ce7] hover:bg-[#6c5ce7]/10 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            {t("upgrade")}
          </Link>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  item,
  label,
  active,
}: {
  item: NavItemDef;
  label: string;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}
