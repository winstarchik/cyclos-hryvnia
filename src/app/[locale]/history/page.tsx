"use client";

import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction } from "@/types";

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
  transaction,
}: {
  index: number;
  transaction: Transaction;
}) {
  const isReceive = transaction.type === "receive";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 rounded-2xl border border-dark-800 bg-dark-900/30 p-4 transition hover:bg-dark-900/50"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
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
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(transaction.timestamp, { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`font-semibold ${
            isReceive ? "text-green-400" : "text-gray-300"
          }`}
        >
          {formatAmount(transaction)}
        </p>
        <p className="text-sm text-gray-400">
          {formatValueUSD(transaction.valueUSD)}
        </p>
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const { transactions, loading } = useTransactions();

  return (
    <main className="min-h-screen bg-dark-950 pb-20 text-white">
      <section className="px-6 pt-6">
        <h1 className="mb-6 text-2xl font-bold text-white">{t("title")}</h1>

        {loading ? <TransactionHistorySkeleton /> : null}

        {!loading && transactions.length === 0 ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-3xl border border-dark-800 bg-dark-900/30 p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dark-800 text-xl">
              ↕️
            </div>
            <p className="text-sm leading-6 text-gray-400">{t("empty")}</p>
          </div>
        ) : null}

        {!loading && transactions.length > 0 ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="space-y-3"
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {transactions.map((transaction, index) => (
              <TransactionItem
                index={index}
                key={transaction.id}
                transaction={transaction}
              />
            ))}
          </motion.div>
        ) : null}
      </section>
    </main>
  );
}

