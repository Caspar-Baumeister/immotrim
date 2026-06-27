import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

// Builds a self-referencing canonical plus matching hreflang alternates for a
// page's own pathname. Relative paths resolve against the `metadataBase` set in
// the locale layout. `path` is the locale-less route (e.g. "" or "/pricing").
export function alternates(locale: string, path = ""): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}
