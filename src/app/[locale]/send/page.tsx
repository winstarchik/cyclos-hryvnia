"use client";

import { type FormEvent, useEffect, useState } from "react";
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend) return;

    window.alert(t("send.comingSoon"));
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-dark-950 pb-[calc(5rem+env(safe-area-inset-bottom))] text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-6">
        <h1 className="mb-8 text-2xl font-bold text-white">
          {t("send.title")}
        </h1>

        <form className="animate-fade-in-up space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-gray-300"
              htmlFor="recipient"
            >
              {t("send.recipientAddress")}
            </label>
            <input
              autoCapitalize="none"
              autoComplete="off"
              className="min-h-12 w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white placeholder-gray-600 transition focus:border-accent-500 focus:outline-none"
              id="recipient"
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="Enter address or domain"
              spellCheck={false}
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
              className="min-h-12 w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white transition focus:border-accent-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
              className="min-h-12 w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white placeholder-gray-600 transition focus:border-accent-500 focus:outline-none"
              id="amount"
              inputMode="decimal"
              min="0"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              step="any"
              type="number"
              value={amount}
            />
          </div>

          <button
            className="mt-8 min-h-12 w-full rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-4 font-semibold text-white transition hover:from-accent-600 hover:to-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSend}
            type="submit"
          >
            {t("send.button")}
          </button>
        </form>
      </div>
    </main>
  );
}
