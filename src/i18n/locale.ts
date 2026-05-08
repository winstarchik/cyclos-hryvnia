import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/request";

/**
 * Get the current locale in client components.
 *
 * This is a small wrapper over `next-intl`'s `useLocale()` that narrows the
 * return type to the locales supported by this app.
 */
export function useAppLocale(): AppLocale {
  return useLocale() as AppLocale;
}

