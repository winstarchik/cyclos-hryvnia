"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M4.75 7.75A2.75 2.75 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-9a2.75 2.75 0 0 1-2.75-2.75v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M15.25 12h4v4.25h-4A2.1 2.1 0 0 1 13.15 14v-.05A2.1 2.1 0 0 1 15.25 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7.25 8h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.75v4.65l3 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ReceiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M12 4.75v12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="m6.75 12.25 5.25 5.25 5.25-5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M5 20h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M7 17 17 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M8 7h9v9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M5 20h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale();
  const { connected } = useWallet();

  const routes: Array<{
    href: string;
    label: string;
    Icon: NavIcon;
  }> = [
    { href: "/wallet", label: t("wallet"), Icon: WalletIcon },
    { href: "/history", label: t("history"), Icon: HistoryIcon },
    { href: "/receive", label: t("receive"), Icon: ReceiveIcon },
    { href: "/send", label: t("send"), Icon: SendIcon },
  ];

  const isAppRoute = routes.some((route) =>
    pathname === `/${locale}${route.href}` ||
    pathname.startsWith(`/${locale}${route.href}/`),
  );

  if (!connected || !isAppRoute) return null;

  return (
    <nav
      aria-label={t("label")}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-dark-950/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl"
    >
      <div className="mx-auto grid h-16 max-w-[480px] grid-cols-4 gap-1">
        {routes.map(({ href, label, Icon }) => {
          const fullHref = `/${locale}${href}`;
          const isActive =
            pathname === fullHref || pathname.startsWith(`${fullHref}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              className="min-w-0"
              href={fullHref}
              key={href}
            >
              <motion.div
                className={`flex h-full min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition ${
                  isActive
                    ? "text-accent-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                whileTap={{ scale: 0.94 }}
              >
                <span
                  className={`flex h-8 w-10 items-center justify-center rounded-2xl transition ${
                    isActive ? "bg-accent-500/15" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </span>
                <span className="max-w-full truncate px-1">{label}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
