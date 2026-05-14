import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

export const locales = ["en", "ua", "ru"] as const;
export type AppLocale = (typeof locales)[number];

function isAppLocale(locale: string): locale is AppLocale {
  return (locales as readonly string[]).includes(locale);
}

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requestedLocale = locale ?? (await requestLocale) ?? "en";
  const resolvedLocale = isAppLocale(requestedLocale) ? requestedLocale : "en";

  const messages = (await import(`./locales/${resolvedLocale}.json`))
    .default as AbstractIntlMessages;

  return { locale: resolvedLocale, messages };
});

