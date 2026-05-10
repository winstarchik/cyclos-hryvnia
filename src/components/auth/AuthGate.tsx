"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useWallet } from "@/hooks/useWallet";

const PROTECTED_ROUTES = ["/wallet", "/history", "/receive", "/send"];
const PREVIEW_AUTH_BYPASS = true;

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { connected, loading } = useWallet();
  const [mounted, setMounted] = useState(false);

  if (PREVIEW_AUTH_BYPASS) {
    return <>{children}</>;
  }

  const isProtectedRoute = useMemo(
    () =>
      PROTECTED_ROUTES.some((route) => {
        const localizedRoute = `/${locale}${route}`;
        return pathname === localizedRoute || pathname.startsWith(`${localizedRoute}/`);
      }),
    [locale, pathname],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isProtectedRoute || connected || loading) return;
    router.replace(`/${locale}`);
  }, [connected, isProtectedRoute, loading, locale, mounted, router]);

  if (isProtectedRoute && (!mounted || loading || !connected)) {
    return (
      <main className="cy-page flex min-h-screen items-center justify-center px-6 text-center">
        <div className="cy-card-soft w-full max-w-sm p-6">
          <LoadingSpinner className="mx-auto h-6 w-6" />
          <h1 className="mt-4 text-xl font-semibold text-white">
            {t("checkingSession")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {t("loginRequired")}
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
