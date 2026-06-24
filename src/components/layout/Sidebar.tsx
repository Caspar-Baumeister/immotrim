"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, PlusCircle } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
};

export function Sidebar({ locale }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (path: string) => pathname.includes(path);

  return (
    <aside className="w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <Link
          href={`/${locale}/portfolio`}
          className="flex items-center gap-2.5"
        >
          <Image
            src="/logo_immotrim.png"
            alt="Immotrim"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="hidden sm:inline text-xl font-bold uppercase tracking-wide text-foreground">
            IMMOTRIM
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        <NavItem
          href={`/${locale}/portfolio`}
          icon={<Building2 className="h-4 w-4" />}
          label={t("portfolio")}
          active={isActive("/portfolio")}
        />
        <NavItem
          href={`/${locale}/property/new`}
          icon={<PlusCircle className="h-4 w-4" />}
          label={t("newProperty")}
          active={isActive("/property/new")}
        />
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-[10px] text-muted-foreground/50">Immotrim v1.0</p>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
