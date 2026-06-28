import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getBaseUrl } from "@/lib/url";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for landing-page headings (shipfa.st-style bold display look).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Document-wide metadata defaults. Per-page canonical/hreflang alternates are set
// in each page's own generateMetadata via @/lib/seo so every indexable URL is
// self-referencing rather than inheriting the homepage's.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: t("siteTitle"),
      template: "%s · Immotrim",
    },
    description: t("siteDescription"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "de")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="text-foreground min-h-screen">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <TooltipProvider>
              <div className="flex flex-col min-h-screen">{children}</div>
            </TooltipProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        {process.env.VERCEL_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
