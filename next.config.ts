import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep the headless-Chromium deps out of the bundle; they ship native/binary
  // assets that must be required at runtime from node_modules.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default withNextIntl(nextConfig);
