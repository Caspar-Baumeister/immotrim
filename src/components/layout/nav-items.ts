import {
  LayoutDashboard,
  Wallet,
  User,
  Building2,
  Compass,
  Landmark,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import type { ProfileCompletion } from "@/features/profile/completeness";

// Single source of truth for the app's primary navigation. `section` links a nav
// item to a completion key so the sidebar can render its Fortschrittsleiste.
// Dashboard and Banken have no bar (they summarise / consume, not collect).

export type NavItemDef = {
  href: string;
  /** Key in the `nav` translation namespace. */
  labelKey: string;
  icon: LucideIcon;
  /** Which completion percentage backs this item's progress bar, if any. */
  section?: keyof ProfileCompletion;
  /** Grouped under the "Unterlagen" heading in the sidebar. */
  group?: "unterlagen";
};

export const NAV_ITEMS: NavItemDef[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/haushalt", labelKey: "haushalt", icon: Wallet, section: "haushalt", group: "unterlagen" },
  { href: "/stammdaten", labelKey: "stammdaten", icon: User, section: "stammdaten", group: "unterlagen" },
  { href: "/portfolio", labelKey: "immobilien", icon: Building2, section: "immobilien", group: "unterlagen" },
  { href: "/strategie", labelKey: "strategie", icon: Compass, section: "strategie", group: "unterlagen" },
  { href: "/checklist", labelKey: "checklist", icon: ClipboardCheck, section: "checklist", group: "unterlagen" },
  { href: "/banken", labelKey: "banken", icon: Landmark },
];
