"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

type LocaleCode = "en" | "ua" | "ru";

const LANGUAGE_OPTIONS: Array<{
  code: LocaleCode;
  label: string;
  name: string;
}> = [
  { code: "en", label: "EN", name: "English" },
  { code: "ua", label: "UA", name: "Ukrainian" },
  { code: "ru", label: "RU", name: "Russian" },
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

function GlobeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M3.6 9h16.8M3.6 15h16.8M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9c-2-2.4-3-5.4-3-9s1-6.6 3-9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const switcherRef = useRef<HTMLDivElement>(null);
  const currentLocale = isLocaleCode(locale) ? locale : "en";
  const currentOption =
    LANGUAGE_OPTIONS.find((option) => option.code === currentLocale) ??
    LANGUAGE_OPTIONS[0];

  const search = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function switchLocale(nextLocale: LocaleCode) {
    setIsOpen(false);

    if (nextLocale === currentLocale) {
      return;
    }

    startTransition(() => {
      router.push(getLocalizedHref(pathname, search, nextLocale));
    });
  }

  return (
    <div className={className} ref={switcherRef}>
      <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="group inline-flex h-11 min-w-[5.25rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-dark-900/70 px-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] outline-none backdrop-blur-xl transition hover:border-accent-500/50 hover:bg-dark-800/80 focus-visible:border-accent-500 focus-visible:ring-2 focus-visible:ring-accent-500/25 disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="text-accent-400 transition group-hover:text-accent-300">
          <GlobeIcon />
        </span>
        <span>{currentOption.label}</span>
        <span className="text-gray-400 transition group-hover:text-white">
          <ChevronIcon open={isOpen} />
        </span>
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-dark-900/95 p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          role="listbox"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = option.code === currentLocale;

            return (
              <button
                aria-selected={selected}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left transition ${
                  selected
                    ? "bg-accent-500/18 text-white"
                    : "text-gray-300 hover:bg-dark-800 hover:text-white"
                }`}
                disabled={isPending}
                key={option.code}
                onClick={() => switchLocale(option.code)}
                role="option"
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                      selected
                        ? "bg-accent-500 text-white"
                        : "bg-dark-800 text-gray-300"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="text-sm font-medium">{option.name}</span>
                </span>

                {selected ? (
                  <span className="h-2 w-2 rounded-full bg-accent-400 shadow-[0_0_14px_rgba(0,212,255,0.8)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      </div>
    </div>
  );
}
