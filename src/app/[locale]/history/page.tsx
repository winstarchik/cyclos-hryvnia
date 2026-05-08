"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction } from "@/types";

function formatRelativeTime(timestamp: number, locale: string): string {
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const ranges: Array<{
    limit: number;
    divisor: number;
    unit: Intl.RelativeTimeFormatUnit;
  }> = [
    { limit: 60, divisor: 1, unit: "second" },
    { limit: 60 * 60, divisor: 60, unit: "minute" },
    { limit: 60 * 60 * 24, divisor: 60 * 60, unit: "hour" },
    { limit: 60 * 60 * 24 * 30, divisor: 60 * 60 * 24, unit: "day" },
    { limit: 60 * 60 * 24 * 365, divisor: 60 * 60 * 24 * 30, unit: "month" },
  ];

  const range =
    ranges.find((item) => absoluteSeconds < item.limit) ??
    ({ divisor: 60 * 60 * 24 * 365, unit: "year" } as const);

  return formatter.format(Math.round(diffSeconds / range.divisor), range.unit);
}

function formatAmount(transaction: Transaction): string {
  const prefix = transaction.type === "receive" ? "+" : "-";
  return `${prefix}${transaction.amount.toFixed(4)} ${transaction.token.symbol}`;
}

function formatValueUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

function TransactionHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border border-dark-800 bg-dark-900/30 p-4"
          key={index}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-dark-800" />
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-dark-800" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-dark-800/80" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-full bg-dark-800" />
            <div className="ml-auto h-3 w-16 animate-pulse rounded-full bg-dark-800/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionItem({
  index,
  locale,
  transaction,
}: {
  index: number;
  locale: string;
  transaction: Transaction;
}) {
  const isReceive = transaction.type === "receive";

  return (
    <div
      className="animate-fade-in-up flex items-center justify-between gap-3 rounded-2xl border border-dark-800 bg-dark-900/30 p-4 transition hover:bg-dark-900/50"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            isReceive
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isReceive ? "⬇️" : "⬆️"}
        </div>
        <div className="min-w-0">
          <p className="capitalize font-semibold text-white">
            {transaction.type}
          </p>
          <p className="truncate text-xs text-gray-500">
            {formatRelativeTime(transaction.timestamp, locale)}
          </p>
        </div>
      </div>

      <div className="min-w-0 max-w-[45%] shrink-0 text-right">
        <p
          className={`break-words text-sm font-semibold sm:text-base ${
            isReceive ? "text-green-400" : "text-gray-300"
          }`}
        >
          {formatAmount(transaction)}
        </p>
        <p className="text-sm text-gray-400">
          {formatValueUSD(transaction.valueUSD)}
        </p>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const common = useTranslations("common");
  const locale = useLocale();
  const { transactions, error, loading, refetch } = useTransactions();

  return (
    <main className="min-h-screen overflow-x-hidden bg-dark-950 pb-[calc(5rem+env(safe-area-inset-bottom))] text-white">
      <section className="mx-auto w-full max-w-2xl px-6 pt-6">
        <h1 className="mb-6 text-2xl font-bold text-white">{t("title")}</h1>

        {loading ? <TransactionHistorySkeleton /> : null}

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

        {!loading && !error && transactions.length === 0 ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-3xl border border-dark-800 bg-dark-900/30 p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dark-800 text-xl">
              ↕️
            </div>
            <p className="text-sm leading-6 text-gray-400">{t("empty")}</p>
          </div>
        ) : null}

        {!loading && transactions.length > 0 ? (
          <div className="animate-fade-in space-y-3">
            {transactions.map((transaction, index) => (
              <TransactionItem
                index={index}
                key={transaction.id}
                locale={locale}
                transaction={transaction}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
