import { LayoutDashboard, Building2, Landmark, type LucideIcon } from "lucide-react";

// Single source of truth for the app's primary navigation.
export type NavItemDef = {
  href: string;
  /** Key in the `nav` translation namespace. */
  labelKey: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItemDef[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/portfolio", labelKey: "immobilien", icon: Building2 },
  { href: "/bankuebersicht", labelKey: "bank", icon: Landmark },
];
