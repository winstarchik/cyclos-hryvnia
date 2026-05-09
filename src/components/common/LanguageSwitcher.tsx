"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

type LocaleCode = "en" | "ua" | "ru";

const LANGUAGE_OPTIONS: Array<{
  code: LocaleCode;
  label: string;
  name: string;
}> = [
  { code: "en", label: "EN", name: "English" },
  { code: "ua", label: "UA", name: "Українська" },
  { code: "ru", label: "RU", name: "Русский" },
];

const LOCALE_CODES = LANGUAGE_OPTIONS.map((option) => option.code);

function isLocaleCode(value: string): value is LocaleCode {
  return LOCALE_CODES.includes(value as LocaleCode);
}

function getLocalizedHref(
  pathname: string,
  search: string,
  nextLocale: LocaleCode,
) {
  const segments = pathname.split("/");

  if (isLocaleCode(segments[1] ?? "")) {
    segments[1] = nextLocale;
  } else {
    segments.splice(1, 0, nextLocale);
  }

  const localizedPath = segments.join("/") || `/${nextLocale}`;
  return search ? `${localizedPath}?${search}` : localizedPath;
}

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentLocale = isLocaleCode(locale) ? locale : "en";

  const search = useMemo(() => searchParams.toString(), [searchParams]);

  return (
    <label
      className={`relative inline-flex h-11 min-w-20 items-center ${className}`}
      title="Language"
    >
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        className="h-11 w-full appearance-none rounded-2xl border border-dark-800 bg-dark-900/80 px-4 pr-9 text-sm font-semibold text-white shadow-lg shadow-black/20 outline-none backdrop-blur-md transition hover:border-dark-700 hover:bg-dark-800/90 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/25 disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (!isLocaleCode(nextLocale) || nextLocale === currentLocale) {
            return;
          }

          startTransition(() => {
            router.push(getLocalizedHref(pathname, search, nextLocale));
          });
        }}
        value={currentLocale}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"
      >
        ▾
      </span>
    </label>
  );
}
