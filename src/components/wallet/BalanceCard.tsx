"use client";

import { useTranslations } from "next-intl";

interface BalanceCardProps {
  address: string | null;
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

export function BalanceCard({ address, totalValueUSD }: BalanceCardProps) {
  const t = useTranslations("wallet");

  return (
    <div className="mt-6 w-full rounded-3xl border border-dark-800 bg-dark-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8">
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
