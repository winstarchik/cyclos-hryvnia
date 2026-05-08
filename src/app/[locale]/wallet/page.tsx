"use client";

import { lazy, Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";

const TokenList = lazy(() =>
  import("@/components/wallet/TokenList").then((mod) => ({
    default: mod.TokenList,
  })),
);

function TokenListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="flex items-center gap-3 rounded-2xl border border-dark-800 bg-dark-900/45 p-4"
          key={index}
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-dark-800" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-full bg-dark-800" />
            <div className="h-3 w-16 animate-pulse rounded-full bg-dark-800/80" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded-full bg-dark-800" />
        </div>
      ))}
    </div>
  );
}

export default function WalletPage() {
  const t = useTranslations("wallet");
  const common = useTranslations("common");
  const locale = useLocale();
  const { address } = useWallet();
  const {
    balances,
    error,
    loading,
    totalValueUSD,
    lastUpdated,
    refetch,
  } = useBalance();

  return (
    <main className="min-h-screen overflow-x-hidden bg-dark-950 pb-[calc(5rem+env(safe-area-inset-bottom))] text-white">
      <header className="animate-fade-in bg-gradient-to-b from-dark-900 to-dark-950 px-6 py-6">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-normal text-white">
            {t("title")}
          </h1>

          <BalanceCard address={address} totalValueUSD={totalValueUSD} />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <a
              className="flex h-12 items-center justify-center rounded-2xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-lg shadow-accent-600/20 transition hover:bg-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/60"
              href={`/${locale}/receive`}
            >
              {t("receive")}
            </a>
            <a
              className="flex h-12 items-center justify-center rounded-2xl border border-dark-700 bg-dark-900 px-4 text-sm font-semibold text-white transition hover:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400/60"
              href={`/${locale}/send`}
            >
              {t("send")}
            </a>
          </div>
        </div>
      </header>

      <section
        className="animate-fade-in mx-auto w-full max-w-2xl px-6 pt-6"
        style={{ animationDelay: "100ms" }}
      >
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">{t("assets")}</h2>
          {lastUpdated ? (
            <p className="text-xs text-gray-500">
              {t("lastUpdated", {
                time: new Date(lastUpdated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          ) : null}
        </div>

        {loading ? <TokenListSkeleton /> : null}

        {error ? (
          <div
            className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100"
            role="alert"
          >
            <p>{t("loadError")}</p>
            <button
              className="mt-3 min-h-11 rounded-xl border border-red-400/40 px-4 text-sm font-semibold text-red-50 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-300/60"
              onClick={() => void refetch()}
              type="button"
            >
              {common("retry")}
            </button>
          </div>
        ) : null}

        {!loading && !error && balances.length === 0 ? (
          <div className="rounded-3xl border border-dark-800 bg-dark-900/45 p-6 text-center text-sm leading-6 text-gray-400">
            {t("emptyAssets")}
          </div>
        ) : null}

        {!loading && balances.length > 0 ? (
          <Suspense fallback={<TokenListSkeleton />}>
            <TokenList balances={balances} />
          </Suspense>
        ) : null}
      </section>
    </main>
  );
}
