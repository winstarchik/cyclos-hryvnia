"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { TokenList } from "@/components/wallet/TokenList";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAddress(address: string | null): string {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function BalanceCard({
  address,
  totalValueUSD,
}: {
  address: string | null;
  totalValueUSD: number;
}) {
  const t = useTranslations("wallet");

  return (
    <div className="mt-6 rounded-3xl border border-dark-800 bg-dark-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
      <p className="text-sm font-medium text-gray-400">{t("totalBalance")}</p>
      <p className="mt-2 text-4xl font-semibold tracking-normal text-white">
        {formatCurrency(totalValueUSD)}
      </p>
      {address ? (
        <p className="mt-3 text-sm text-gray-400">
          {t("connectedAddress", { address: formatAddress(address) })}
        </p>
      ) : null}
    </div>
  );
}

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
  const locale = useLocale();
  const { address } = useWallet();
  const { balances, loading, totalValueUSD, lastUpdated } = useBalance();

  return (
    <main className="min-h-screen bg-dark-950 pb-20 text-white">
      <motion.header
        className="bg-gradient-to-b from-dark-900 to-dark-950 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-semibold tracking-normal text-white">
          {t("title")}
        </h1>

        <BalanceCard address={address} totalValueUSD={totalValueUSD} />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            className="flex h-12 items-center justify-center rounded-2xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-lg shadow-accent-600/20 transition hover:bg-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/60"
            href={`/${locale}/receive`}
          >
            {t("receive")}
          </Link>
          <Link
            className="flex h-12 items-center justify-center rounded-2xl border border-dark-700 bg-dark-900 px-4 text-sm font-semibold text-white transition hover:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400/60"
            href={`/${locale}/send`}
          >
            {t("send")}
          </Link>
        </div>
      </motion.header>

      <motion.section
        className="px-6 pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
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

        {!loading && balances.length === 0 ? (
          <div className="rounded-3xl border border-dark-800 bg-dark-900/45 p-6 text-center text-sm leading-6 text-gray-400">
            {t("emptyAssets")}
          </div>
        ) : null}

        {!loading && balances.length > 0 ? (
          <TokenList balances={balances} />
        ) : null}
      </motion.section>
    </main>
  );
}
