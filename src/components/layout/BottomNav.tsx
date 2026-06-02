"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";

const APP_ROUTES = ["/wallet", "/history", "/nfts", "/receive", "/send"] as const;

/* ── Icons — stroke thickens when active ───────────────────── */
function HomeIcon({ a }: { a: boolean }) {
  const w = a ? "2.1" : "1.7";
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z"
        stroke="currentColor" strokeWidth={w} strokeLinejoin="round" />
      <path d="M9 21V12h6v9"
        stroke="currentColor" strokeWidth={w} strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon({ a }: { a: boolean }) {
  const w = a ? "2.1" : "1.7";
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth={w} />
      <path d="M12 7.75v4.65l3 2"
        stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QRIcon({ a }: { a: boolean }) {
  const w = a ? "2.1" : "1.7";
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={w} />
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={w} />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={w} />
      <path d="M13 17h4M17 13v4" stroke="currentColor" strokeLinecap="round" strokeWidth={w} />
    </svg>
  );
}

function NFTIcon({ a }: { a: boolean }) {
  const w = a ? "2.1" : "1.7";
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5Z"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M5 11.25 12 15l7-3.75M5 15.25 12 19l7-3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={w}
      />
    </svg>
  );
}

function SendIcon({ a }: { a: boolean }) {
  const w = a ? "2.1" : "1.7";
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Component ─────────────────────────────────────────────── */
export function BottomNav() {
  const t        = useTranslations("nav");
  const pathname = usePathname();
  const locale   = useLocale();

  const routes = [
    { href: "/wallet",  label: t("wallet"),  Icon: HomeIcon    },
    { href: "/history", label: t("history"), Icon: HistoryIcon },
    { href: "/nfts",    label: t("nfts"),    Icon: NFTIcon     },
    { href: "/receive", label: t("receive"), Icon: QRIcon      },
    { href: "/send",    label: t("send"),    Icon: SendIcon    },
  ] as const;

  const isAppRoute = APP_ROUTES.some(
    r => pathname === `/${locale}${r}` || pathname.startsWith(`/${locale}${r}/`),
  );

  if (!isAppRoute) return null;

  return (
    <nav
      aria-label={t("label")}
      className="bottom-nav-bg fixed bottom-0 left-0 right-0 z-50 px-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-[67px] max-w-[520px] grid-cols-5 gap-[3px] px-[7px]">
        {routes.map(({ href, label, Icon }) => {
          const full     = `/${locale}${href}`;
          const isActive = pathname === full || pathname.startsWith(`${full}/`);

          return (
            <Link
              key={href} href={full}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              className="min-w-0"
            >
              <motion.div
                whileTap={{ scale: 0.90 }}
                className={`flex h-full flex-col items-center justify-center gap-[3px] transition-colors
                  ${isActive ? "text-accent-400" : "text-[#3a4f6e] hover:text-[#7a8faa]"}`}
              >
                {/* pill highlight */}
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-[11px_17px_11px_17px] transition-all
                    ${isActive ? "border border-accent-400/25 bg-accent-500/15 shadow-[0_0_23px_rgba(65,105,225,.2)]" : "bg-transparent"}`}
                >
                  <Icon a={isActive} />
                </span>
                <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">
                  {label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
