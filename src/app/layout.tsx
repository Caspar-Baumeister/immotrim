import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { getBaseUrl } from "@/lib/url";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for headings — clean geometric sans (Makeral-style).
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

type Props = {
  children: React.ReactNode;
};

// Document-wide metadata defaults. Per-page canonical alternates are set in each
// page's own generateMetadata via @/lib/seo so every indexable URL is
// self-referencing rather than inheriting the homepage's.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo");
  return {
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: t("siteTitle"),
      template: "%s · Immotrim",
    },
    description: t("siteDescription"),
  };
}

export default async function RootLayout({ children }: Props) {
  const messages = await getMessages();

  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable}`}
    >
      <body className="text-foreground min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>
            <div className="flex flex-col min-h-screen">{children}</div>
          </TooltipProvider>
        </NextIntlClientProvider>
        {process.env.VERCEL_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
