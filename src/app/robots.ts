import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/url";

// Crawling is allowed broadly; indexing of private/transactional pages is
// controlled via per-page `robots: { index: false }` metadata, not disallow
// rules here. Only the API surface is fenced off.
export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
