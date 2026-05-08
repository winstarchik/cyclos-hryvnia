"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const routes = [
    { href: "/wallet", label: t("wallet"), icon: "\u{1F4B0}" },
    { href: "/history", label: t("history"), icon: "\u{1F4DC}" },
    { href: "/receive", label: t("receive"), icon: "\u2B07\uFE0F" },
    { href: "/send", label: t("send"), icon: "\u2B06\uFE0F" },
  ];

  const isAppRoute = routes.some((route) => pathname.includes(route.href));

  if (!isAppRoute) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-dark-800 bg-dark-950/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around gap-2">
        {routes.map((route) => {
          const isActive = pathname.includes(route.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              aria-label={route.label}
              className="flex-1"
              href={`/${locale}${route.href}`}
              key={route.href}
            >
              <div
                className={`min-h-14 rounded-xl border px-1 py-2 text-center transition active:scale-95 ${
                  isActive
                    ? "border-accent-500 bg-accent-500/20"
                    : "border-dark-800"
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {route.icon}
                </span>
                <p
                  className={`mt-1 text-xs ${
                    isActive ? "text-accent-400" : "text-gray-500"
                  }`}
                >
                  {route.label}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
