import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { notFound } from "next/navigation";

export const locales = ["en", "ua", "ru"] as const;
export type AppLocale = (typeof locales)[number];

function isAppLocale(locale: string): locale is AppLocale {
  return (locales as readonly string[]).includes(locale);
}

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const resolvedLocale = locale ?? (await requestLocale) ?? "en";

  if (!isAppLocale(resolvedLocale)) {
    notFound();
  }

  const messages = (await import(`./locales/${resolvedLocale}.json`))
    .default as AbstractIntlMessages;

  return { locale: resolvedLocale, messages };
});

