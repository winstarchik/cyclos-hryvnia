"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ForgePulse } from "@/components/common/ForgeUI";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction, TransactionType } from "@/types";

type HistoryFilter = "all" | TransactionType;

function formatRelativeTime(timestamp: number, locale: string): string {
  const intlLocale = locale === "ua" ? "uk-UA" : locale;
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });

  const ranges: Array<{
    divisor: number;
    limit: number;
    unit: Intl.RelativeTimeFormatUnit;
  }> = [
    { divisor: 1, limit: 60, unit: "second" },
    { divisor: 60, limit: 60 * 60, unit: "minute" },
    { divisor: 60 * 60, limit: 60 * 60 * 24, unit: "hour" },
    { divisor: 60 * 60 * 24, limit: 60 * 60 * 24 * 30, unit: "day" },
    {
      divisor: 60 * 60 * 24 * 30,
      limit: 60 * 60 * 24 * 365,
      unit: "month",
    },
  ];

  const range =
    ranges.find((item) => absoluteSeconds < item.limit) ??
    ({ divisor: 60 * 60 * 24 * 365, unit: "year" } as const);

  return formatter.format(Math.round(diffSeconds / range.divisor), range.unit);
}

function getDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayGroup(timestamp: number, locale: string): string {
  const intlLocale = locale === "ua" ? "uk-UA" : locale;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const date = new Date(timestamp);
  const key = getDayKey(timestamp);

  if (key === getDayKey(today.getTime())) {
    if (locale === "ru") return "Сегодня";
    if (locale === "ua") return "Сьогодні";
    return "Today";
  }

  if (key === getDayKey(yesterday.getTime())) {
    if (locale === "ru") return "Вчера";
    if (locale === "ua") return "Вчора";
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatAmount(transaction: Transaction): string {
  const prefix = transaction.type === "receive" ? "+" : transaction.type === "swap" ? "" : "-";
  const maxDecimals = transaction.token.symbol === "SOL" ? 6 : 4;
  const amount = transaction.amount
    .toFixed(maxDecimals)
    .replace(/\.?0+$/, "");

  return `${prefix}${amount || "0"} ${transaction.token.symbol}`;
}

function TransactionHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, index) => (
        <div className="cy-card flex items-center justify-between gap-3 p-4" key={index}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.07]" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.06]" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="ml-auto h-3 w-16 animate-pulse rounded-full bg-white/[0.06]" />
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
  typeLabel,
}: {
  index: number;
  locale: string;
  transaction: Transaction;
  typeLabel: string;
}) {
  const isReceive = transaction.type === "receive";
  const isSwap = transaction.type === "swap";

  return (
    <div
      className="animate-fade-in-up cy-card flex items-center justify-between gap-3 p-4 transition hover:bg-[#162033]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
            isReceive
              ? "bg-green-500/15 text-green-400"
              : isSwap
                ? "bg-accent-500/15 text-accent-400"
                : "bg-red-500/15 text-red-400"
          }`}
        >
          {isReceive ? "↓" : isSwap ? "⇄" : "↑"}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">{typeLabel}</p>
          <p className="truncate text-xs text-gray-500">
            {formatRelativeTime(transaction.timestamp, locale)}
          </p>
        </div>
      </div>

      <div className="min-w-0 max-w-[45%] shrink-0 text-right">
        <p
          className={`break-words text-sm font-semibold sm:text-base ${
            isReceive
              ? "text-green-400"
              : isSwap
                ? "text-accent-400"
                : "text-red-400"
          }`}
        >
          {formatAmount(transaction)}
        </p>
        <p className="text-sm text-gray-400">
          ${transaction.valueUSD.toFixed(2)}
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
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((transaction) => transaction.type === filter);
  }, [filter, transactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();

    for (const transaction of filteredTransactions) {
      const key = getDayKey(transaction.timestamp);
      const group = groups.get(key) ?? [];
      group.push(transaction);
      groups.set(key, group);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: formatDayGroup(items[0]?.timestamp ?? Date.now(), locale),
      items,
    }));
  }, [filteredTransactions, locale]);

  const filters: Array<{ key: HistoryFilter; label: string }> = [
    { key: "all", label: t("filters.all") },
    { key: "send", label: t("filters.send") },
    { key: "receive", label: t("filters.receive") },
    { key: "swap", label: t("filters.swap") },
  ];
  const isInitialLoad = loading && transactions.length === 0;

  return (
    <main className="cy-page pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <section
        aria-busy={loading}
        className="mx-auto w-full max-w-[480px] px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)]"
      >
        <div className="mb-5">
          <ForgePulse>{t("eyebrow")}</ForgePulse>
          <h1 className="mt-2 text-3xl font-bold text-white">{t("title")}</h1>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <Button
              className={`shrink-0 rounded-xl px-4 text-sm ${
                filter === item.key
                  ? ""
                  : "border-white/[0.07] bg-white/[0.04] text-gray-400 hover:bg-white/[0.07] hover:text-white"
              }`}
              key={item.key}
              onClick={() => setFilter(item.key)}
              size="sm"
              type="button"
              variant={filter === item.key ? "primary" : "secondary"}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {isInitialLoad ? <TransactionHistorySkeleton /> : null}

        {loading && transactions.length > 0 ? (
          <p
            className="mb-4 inline-flex items-center gap-2 text-xs text-gray-500"
            role="status"
          >
            <LoadingSpinner className="h-3 w-3" />
            <span>{common("refreshing")}</span>
          </p>
        ) : null}

        {error ? (
          <div
            className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100"
            role="alert"
          >
            <p>{t("loadError")}</p>
            <Button
              className="mt-3 border-red-400/40 text-red-50 hover:bg-red-500/20"
              onClick={() => void refetch()}
              size="sm"
              type="button"
              variant="ghost"
            >
              {common("retry")}
            </Button>
          </div>
        ) : null}

        {!loading && !error && filteredTransactions.length === 0 ? (
          <div className="cy-card flex min-h-[45vh] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-2xl text-accent-400">
              ↕
            </div>
            <p className="text-sm leading-6 text-gray-400">{t("empty")}</p>
          </div>
        ) : null}

        {!isInitialLoad && groupedTransactions.length > 0 ? (
          <div className="animate-fade-in space-y-6">
            {groupedTransactions.map((group) => (
              <section key={group.key}>
                <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5d7ab8]">
                  {group.label}
                </h2>
                <div className="space-y-3">
                  {group.items.map((transaction, index) => (
                    <TransactionItem
                      index={index}
                      key={transaction.id}
                      locale={locale}
                      transaction={transaction}
                      typeLabel={t(`types.${transaction.type}`)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
