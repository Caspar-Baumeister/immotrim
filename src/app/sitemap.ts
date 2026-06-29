import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getBaseUrl } from "@/lib/url";

// Only public, indexable routes belong here. Auth, password-reset, report share
// links and gated app routes are deliberately excluded (they carry `noindex`).
const PUBLIC_PATHS = ["", "/pricing", "/impressum", "/datenschutz", "/privacy-settings", "/agb"];

// German-only guides — these have no English translation, so they appear once
// under /de with no hreflang alternates (matching the page's canonical).
const DE_ONLY_PATHS = ["/ratgeber/bankenreport-immobilienportfolio-erstellen"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();

  const localized = PUBLIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    })),
  );

  const deOnly = DE_ONLY_PATHS.map((path) => ({ url: `${base}/de${path}` }));

  return [...localized, ...deOnly];
}
