"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Balance } from "@/types";

interface TokenListProps {
  balances: Balance[];
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function formatValueUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function TokenList({ balances }: TokenListProps) {
  if (balances.length === 0) return null;

  return (
    <div className="space-y-3">
      {balances.map((balance, index) => (
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between gap-3 rounded-2xl border border-dark-800 bg-dark-900/30 p-4 backdrop-blur-sm transition hover:bg-dark-900/50"
          initial={{ opacity: 0, x: -20 }}
          key={balance.token.address}
          transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            {balance.token.logo ? (
              <Image
                alt={balance.token.symbol}
                className="rounded-full"
                height={40}
                loading={index > 5 ? "lazy" : "eager"}
                src={balance.token.logo}
                width={40}
              />
            ) : (
              <div
                aria-label={balance.token.symbol}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark-800 text-sm font-semibold text-accent-400"
              >
                {balance.token.symbol.slice(0, 2)}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-semibold text-white">
                {balance.token.symbol}
              </p>
              <p className="truncate text-xs text-gray-500">
                {balance.token.name}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-semibold text-white">
              {formatAmount(balance.amount)} {balance.token.symbol}
            </p>
            <p className="text-sm text-gray-400">
              {formatValueUSD(balance.valueUSD)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

