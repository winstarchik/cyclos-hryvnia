"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
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
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    setSuccess(false);
  }, [recipient, selectedToken, amount]);

  const canSend =
    connected &&
    Boolean(recipient.trim()) &&
    Boolean(amount) &&
    Boolean(selectedToken) &&
    !processing;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend) return;

    setProcessing(true);
    setSuccess(false);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      setSuccess(true);
      window.alert(t("send.comingSoon"));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-dark-950 pb-[calc(5rem+env(safe-area-inset-bottom))] text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-6">
        <h1 className="mb-8 text-2xl font-bold text-white">
          {t("send.title")}
        </h1>

        <form
          aria-busy={processing}
          aria-live="polite"
          className="animate-fade-in-up space-y-6"
          onSubmit={handleSubmit}
        >
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
              disabled={processing}
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
              disabled={processing || balances.length === 0}
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
              onChange={(event) => setAmount(event.target.value)}
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0.00"
              disabled={processing}
              type="text"
              value={amount}
            />
          </div>

          {success ? (
            <p
              className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-100"
              role="status"
            >
              {t("send.readyMessage")}
            </p>
          ) : null}

          <Button
            className="mt-8"
            disabled={!canSend}
            fullWidth
            isLoading={processing}
            loadingText={t("send.processing")}
            size="lg"
            type="submit"
          >
            {t("send.button")}
          </Button>
        </form>
      </div>
    </main>
  );
}
