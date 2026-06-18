import "server-only";
import type { Browser } from "puppeteer-core";

// Default Chrome locations for local development per platform. Override with
// CHROME_EXECUTABLE_PATH if Chrome lives elsewhere.
const LOCAL_CHROME: Record<string, string> = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};

function isServerless(): boolean {
  return Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_REGION
  );
}

// Launch a headless browser: bundled @sparticuz/chromium on serverless (Vercel),
// a locally installed Chrome in development.
export async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  if (isServerless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 820, height: 1160 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    LOCAL_CHROME[process.platform] ||
    LOCAL_CHROME.linux;

  return puppeteer.launch({
    executablePath,
    defaultViewport: { width: 820, height: 1160 },
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
