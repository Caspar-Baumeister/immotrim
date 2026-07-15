import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/url";

// Only public, indexable routes belong here. Auth, password-reset, report share
// links and gated app routes are deliberately excluded (they carry `noindex`).
const PUBLIC_PATHS = [
  "",
  "/pricing",
  "/impressum",
  "/datenschutz",
  "/privacy-settings",
  "/agb",
  "/ratgeber/bankenreport-immobilienportfolio-erstellen",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  return PUBLIC_PATHS.map((path) => ({ url: `${base}${path}` }));
}
