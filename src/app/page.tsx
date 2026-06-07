import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

// The app is fully localized under /[locale]; there is no un-prefixed root page.
// The proxy normally redirects "/" to a locale, but make "/" a real route too so
// the bare domain never falls through to a platform 404 if the proxy doesn't run.
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
