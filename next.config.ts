import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin the project root explicitly — Turbopack's lockfile-based auto-detection
  // can otherwise land one directory too high (seen on some machines), breaking
  // module resolution (e.g. "Can't resolve 'tailwindcss'").
  turbopack: {
    root: import.meta.dirname,
  },
  // Keep the headless-Chromium deps out of the bundle; they ship native/binary
  // assets that must be required at runtime from node_modules.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // The logo is a first-party inline SVG icon (document + pen). next/image blocks
  // SVGs by default; allow it, sandboxed via CSP since these are our own assets.
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // @sparticuz/chromium loads its brotli-compressed binary from bin/*.br via a
  // computed path at runtime, so file-tracing can't detect it and drops it from
  // the serverless function (→ "input directory .../@sparticuz/chromium/bin does
  // not exist" and a 502). EVERY route that calls launchBrowser() needs its own
  // entry here — keys are picomatch route globs, and `*` covers the dynamic
  // [bankId] segment.
  outputFileTracingIncludes: {
    "/api/portfolio/report": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/selbstauskunft/*": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  // The app was previously served under a /[locale] prefix (/de, /en). It is now
  // German-only with flat URLs, so redirect any legacy locale-prefixed URL
  // (bookmarks, shared /de/report/... links, already-issued Stripe return URLs)
  // to its flat equivalent.
  async redirects() {
    return [
      {
        source: "/:locale(de|en)/:path*",
        destination: "/:path*",
        permanent: false,
      },
      {
        source: "/:locale(de|en)",
        destination: "/",
        permanent: false,
      },
      // The Konzept layer was removed 2026-09 — objects are top-level now. Old
      // concept ids don't map to object ids, so everything lands on the overview.
      {
        source: "/konzepte/:path*",
        destination: "/objekte",
        permanent: false,
      },
      {
        source: "/konzepte",
        destination: "/objekte",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
