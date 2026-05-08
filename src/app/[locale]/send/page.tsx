"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import type { Balance } from "@/types";

/**
 * v1: Button shows alert. Phase 4 will implement actual transaction signing.
 */
export default function SendPage() {
  const t = useTranslations();
  const { connected } = useWallet();
  const { balances } = useBalance();
  const [recipient, setRecipient] = useState("");
  const [selectedToken, setSelectedToken] = useState<
    Balance["token"] | undefined
  >(balances[0]?.token);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (balances.length === 0) {
      setSelectedToken(undefined);
      return;
    }

    const selectedTokenExists = balances.some(
      (balance) => balance.token.symbol === selectedToken?.symbol,
    );

    if (!selectedTokenExists) {
      setSelectedToken(balances[0].token);
    }
  }, [balances, selectedToken]);

  const canSend =
    connected && Boolean(recipient.trim()) && Boolean(amount) && selectedToken;

  return (
    <main className="flex min-h-screen flex-col bg-dark-950 p-6 pb-20 text-white">
      <h1 className="mb-8 text-2xl font-bold text-white">
        {t("send.title")}
      </h1>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div>
          <label
            className="mb-2 block text-sm font-medium text-gray-300"
            htmlFor="recipient"
          >
            {t("send.recipientAddress")}
          </label>
          <input
            className="w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white placeholder-gray-600 transition focus:border-accent-500 focus:outline-none"
            id="recipient"
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="Enter address or domain"
            type="text"
            value={recipient}
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-gray-300"
            htmlFor="token"
          >
            {t("send.selectToken")}
          </label>
          <select
            className="w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white transition focus:border-accent-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={balances.length === 0}
            id="token"
            onChange={(event) =>
              setSelectedToken(
                balances.find(
                  (balance) => balance.token.symbol === event.target.value,
                )?.token,
              )
            }
            value={selectedToken?.symbol || ""}
          >
            {balances.length === 0 ? (
              <option value="">{t("send.selectToken")}</option>
            ) : null}
            {balances.map((balance) => (
              <option key={balance.token.symbol} value={balance.token.symbol}>
                {balance.token.symbol} ({balance.amount.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-gray-300"
            htmlFor="amount"
          >
            {t("send.amount")}
          </label>
          <input
            className="w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white placeholder-gray-600 transition focus:border-accent-500 focus:outline-none"
            id="amount"
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            type="number"
            value={amount}
          />
        </div>

        <button
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-4 font-semibold text-white transition hover:from-accent-600 hover:to-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/60 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSend}
          onClick={() => window.alert(t("send.comingSoon"))}
          type="button"
        >
          {t("send.button")}
        </button>
      </motion.div>
    </main>
  );
}
