"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TokenList } from "@/components/wallet/TokenList";
import { useBalance } from "@/hooks/useBalance";
import { useTransactions } from "@/hooks/useTransactions";
import { useWallet } from "@/hooks/useWallet";
import type { Transaction } from "@/types";

type WalletTab = "assets" | "activity";

function ArrowUpRightIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 17 17 7M17 7H8M17 7v9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5v14M5.5 12.5 12 19l6.5-6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function CUAHIcon({ size = 52 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 52 52" width={size}>
      <circle cx="26" cy="26" fill="#4169e1" r="26" />
      <circle cx="18" cy="15" fill="white" opacity="0.18" r="9" />
      <text
        dominantBaseline="middle"
        fill="white"
        fontSize="26"
        fontWeight="700"
        textAnchor="middle"
        x="50%"
        y="55%"
      >
        ₴
      </text>
    </svg>
  );
}

function RowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="cy-card flex items-center gap-3 p-4" key={index}>
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.07]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="h-3 w-16 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="ml-auto h-3 w-14 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value: number, locale: string) {
  const intlLocale = locale === "ua" ? "uk-UA" : locale;
  return new Intl.NumberFormat(intlLocale, {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatToken(value: number, locale: string) {
  const intlLocale = locale === "ua" ? "uk-UA" : locale;
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatAddress(address: string | null) {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function TransactionRow({
  index,
  transaction,
}: {
  index: number;
  transaction: Transaction;
}) {
  const isReceive = transaction.type === "receive";
  const isSwap = transaction.type === "swap";

  return (
    <div
      className="animate-fade-in-up cy-card flex items-center gap-3 p-4 transition hover:bg-[#162033]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
          isReceive
            ? "bg-green-500/15 text-green-400"
            : isSwap
              ? "bg-accent-500/15 text-accent-400"
              : "bg-red-500/15 text-red-400"
        }`}
      >
        {isReceive ? "↓" : isSwap ? "⇄" : "↑"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold capitalize text-white">
          {transaction.type}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {new Date(transaction.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className="min-w-0 max-w-[48%] text-right">
        <p
          className={`break-words text-sm font-semibold ${
            isReceive
              ? "text-green-400"
              : isSwap
                ? "text-accent-400"
                : "text-red-400"
          }`}
        >
          {isReceive ? "+" : isSwap ? "" : "-"}
          {transaction.amount.toFixed(4)} {transaction.token.symbol}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          ${transaction.valueUSD.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const t = useTranslations("wallet");
  const historyT = useTranslations("history");
  const common = useTranslations("common");
  const locale = useLocale();
  const { address } = useWallet();
  const {
    balances,
    error: balanceError,
    lastUpdated,
    loading: balanceLoading,
    refetch: refetchBalances,
    totalValueUSD,
  } = useBalance();
  const {
    error: transactionError,
    loading: transactionLoading,
    refetch: refetchTransactions,
    transactions,
  } = useTransactions();
  const [tab, setTab] = useState<WalletTab>("assets");

  const cuahBalance = balances.find(
    (balance) => balance.token.symbol.toLowerCase() === "cuah",
  );
  const isInitialBalanceLoad = balanceLoading && balances.length === 0;
  const isInitialTransactionLoad =
    transactionLoading && transactions.length === 0;

  return (
    <main className="cy-page pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[480px]">
        <header className="bg-gradient-to-b from-[#0f1a35] to-dark-950 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <div className="animate-fade-in-up rounded-[1.35rem] border border-accent-500/30 bg-[linear-gradient(135deg,#1a2d5a_0%,#111e42_100%)] p-5 shadow-2xl shadow-black/30">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#8ba3e0]">
                  {t("totalBalance")}
                </p>
                {isInitialBalanceLoad ? (
                  <div className="mt-3 h-10 w-44 animate-pulse rounded-xl bg-white/10" />
                ) : (
                  <p className="mt-2 break-words text-3xl font-bold tracking-normal text-white">
                    {formatCurrency(totalValueUSD, locale)}
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-green-400">
                  {cuahBalance
                    ? `${formatToken(cuahBalance.amount, locale)} cUAH`
                    : address
                      ? t("cuahReady")
                      : t("connectHint")}
                </p>
              </div>
              <CUAHIcon />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                className="flex min-h-14 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.06] text-sm font-semibold text-white transition hover:bg-white/[0.1] active:scale-[0.98]"
                href={`/${locale}/send`}
              >
                <ArrowUpRightIcon />
                <span>{t("send")}</span>
              </Link>
              <Link
                className="flex min-h-14 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.06] text-sm font-semibold text-white transition hover:bg-white/[0.1] active:scale-[0.98]"
                href={`/${locale}/receive`}
              >
                <ArrowDownIcon />
                <span>{t("receive")}</span>
              </Link>
            </div>
          </div>

          <div className="mt-4 flex gap-2 border-b border-white/[0.06] pb-4">
            {(["assets", "activity"] as const).map((item) => (
              <Button
                className={`min-h-10 rounded-xl px-5 py-2 text-sm ${
                  tab === item
                    ? ""
                    : "border-transparent bg-transparent text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
                }`}
                key={item}
                onClick={() => setTab(item)}
                size="sm"
                type="button"
                variant={tab === item ? "primary" : "ghost"}
              >
                {item === "assets" ? t("assets") : t("activity")}
              </Button>
            ))}
          </div>
        </header>

        <section
          aria-busy={tab === "assets" ? balanceLoading : transactionLoading}
          className="px-4 pt-4"
        >
          {tab === "assets" ? (
            <div className="space-y-3">
              {balanceLoading && balances.length > 0 ? (
                <p
                  className="inline-flex items-center gap-2 text-xs text-gray-500"
                  role="status"
                >
                  <LoadingSpinner className="h-3 w-3" />
                  <span>{common("refreshing")}</span>
                </p>
              ) : null}

              {isInitialBalanceLoad ? <RowSkeleton /> : null}

              {balanceError ? (
                <div
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100"
                  role="alert"
                >
                  <p>{t("loadError")}</p>
                  <Button
                    className="mt-3 border-red-400/40 text-red-50 hover:bg-red-500/20"
                    onClick={() => void refetchBalances()}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {common("retry")}
                  </Button>
                </div>
              ) : null}

              {!balanceLoading && !balanceError && balances.length === 0 ? (
                <div className="cy-card p-8 text-center text-sm leading-6 text-gray-500">
                  {t("emptyAssets")}
                </div>
              ) : null}

              {!isInitialBalanceLoad && balances.length > 0 ? (
                <TokenList balances={balances} />
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {transactionLoading && transactions.length > 0 ? (
                <p
                  className="inline-flex items-center gap-2 text-xs text-gray-500"
                  role="status"
                >
                  <LoadingSpinner className="h-3 w-3" />
                  <span>{common("refreshing")}</span>
                </p>
              ) : null}

              {isInitialTransactionLoad ? <RowSkeleton count={3} /> : null}

              {transactionError ? (
                <div
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100"
                  role="alert"
                >
                  <p>{historyT("loadError")}</p>
                  <Button
                    className="mt-3 border-red-400/40 text-red-50 hover:bg-red-500/20"
                    onClick={() => void refetchTransactions()}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {common("retry")}
                  </Button>
                </div>
              ) : null}

              {!transactionLoading &&
              !transactionError &&
              transactions.length === 0 ? (
                <div className="cy-card p-8 text-center text-sm leading-6 text-gray-500">
                  {historyT("empty")}
                </div>
              ) : null}

              {!isInitialTransactionLoad && transactions.length > 0
                ? transactions.slice(0, 8).map((transaction, index) => (
                    <TransactionRow
                      index={index}
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))
                : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
