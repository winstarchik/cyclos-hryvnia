"use client";

import { useTranslations } from "next-intl";

interface BalanceCardProps {
  address: string | null;
  loading?: boolean;
  totalValueUSD: number;
}

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

function BalanceCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="cy-card-soft mt-6 w-full p-5 sm:p-8"
      role="status"
    >
      <div className="h-4 w-28 animate-pulse rounded-full bg-dark-800" />
      <div className="mt-4 h-10 w-48 animate-pulse rounded-full bg-dark-800 sm:h-12" />
      <div className="mt-4 h-4 w-36 animate-pulse rounded-full bg-dark-800/80" />
      <span className="sr-only">Loading balance</span>
    </div>
  );
}

export function BalanceCard({
  address,
  loading = false,
  totalValueUSD,
}: BalanceCardProps) {
  const t = useTranslations("wallet");

  if (loading) {
    return <BalanceCardSkeleton />;
  }

  return (
    <div aria-busy={false} className="cy-card-soft mt-6 w-full p-5 sm:p-8">
      <p className="text-sm font-medium text-gray-400">{t("totalBalance")}</p>
      <p className="mt-2 break-words text-4xl font-semibold tracking-normal text-white sm:text-5xl">
        {formatCurrency(totalValueUSD)}
      </p>
      {address ? (
        <p className="mt-3 truncate text-sm text-gray-400">
          {t("connectedAddress", { address: formatAddress(address) })}
        </p>
      ) : null}
    </div>
  );
}
