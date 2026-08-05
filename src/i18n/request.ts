import { getRequestConfig } from "next-intl/server";

// Single-locale app (German only). next-intl is kept solely as the message loader —
// there is no locale routing, so the locale is fixed here.
export const LOCALE = "de";

export default getRequestConfig(async () => {
  return {
    locale: LOCALE,
    messages: (await import(`../../messages/${LOCALE}.json`)).default,
  };
});
