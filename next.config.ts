import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { routing } from "./src/i18n/routing";

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
  // The next-intl middleware (src/proxy.ts) normally redirects "/" to a locale.
  // Keep a static fallback here so the bare domain never 404s if the proxy
  // doesn't run. There is no un-prefixed root layout anymore.
  async redirects() {
    return [
      {
        source: "/",
        destination: `/${routing.defaultLocale}`,
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
