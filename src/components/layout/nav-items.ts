import { LayoutDashboard, Building2, type LucideIcon } from "lucide-react";

// Single source of truth for the app's primary navigation.
export type NavItemDef = {
  href: string;
  /** Key in the `nav` translation namespace. */
  labelKey: string;
  icon: LucideIcon;
  /** Paths under which this item counts as active, besides its own. */
  also?: string[];
};

export const NAV_ITEMS: NavItemDef[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, also: ["/bankuebersicht"] },
  { href: "/portfolio", labelKey: "immobilien", icon: Building2, also: ["/property"] },
];
