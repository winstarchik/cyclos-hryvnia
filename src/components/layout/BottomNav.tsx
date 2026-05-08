"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function BottomNav() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const ROUTES = [
    { href: "/wallet", label: "Wallet", icon: "💰" },
    { href: "/history", label: "History", icon: "📜" },
    { href: "/receive", label: "Receive", icon: "⬇️" },
    { href: "/send", label: "Send", icon: "⬆️" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-dark-800 bg-dark-950 px-4 py-3">
      <div className="mx-auto flex max-w-md items-center justify-around gap-2">
        {ROUTES.map((route) => {
          const isActive = pathname.includes(route.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className="flex-1"
              href={`/${locale}${route.href}`}
              key={route.href}
            >
              <motion.div
                className={`rounded-xl border py-3 text-center transition ${
                  isActive
                    ? "border-accent-500 bg-accent-500/20"
                    : "border-dark-800"
                }`}
                whileTap={{ scale: 0.9 }}
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
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

