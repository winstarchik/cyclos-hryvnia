"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import type { Balance } from "@/types";

function BackIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M19 12H5m7-7-7 7 7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M9 9h6v6H9z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function formatBalance(value: number, locale: string) {
  const intlLocale = locale === "ua" ? "uk-UA" : locale;
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 4,
  }).format(value);
}

function normalizeAmount(value: string): number {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SendPage() {
  const t = useTranslations("send");
  const common = useTranslations("common");
  const locale = useLocale();
  const { connected } = useWallet();
  const { balances, loading } = useBalance();
  const [recipient, setRecipient] = useState("");
  const [selectedToken, setSelectedToken] = useState<
    Balance["token"] | undefined
  >(balances[0]?.token);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
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
  }, [recipient, selectedToken, amount, memo]);

  const selectedBalance = useMemo(
    () =>
      balances.find(
        (balance) => balance.token.symbol === selectedToken?.symbol,
      ),
    [balances, selectedToken],
  );
  const numericAmount = normalizeAmount(amount);
  const hasEnoughBalance =
    selectedBalance !== undefined && numericAmount <= selectedBalance.amount;
  const canSend =
    connected &&
    Boolean(recipient.trim()) &&
    numericAmount > 0 &&
    Boolean(selectedToken) &&
    hasEnoughBalance &&
    !processing;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend) return;

    setProcessing(true);
    setSuccess(false);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      setSuccess(true);
    } finally {
      setProcessing(false);
    }
  }

  function setMaxAmount() {
    if (selectedBalance) {
      setAmount(String(selectedBalance.amount));
    }
  }

  return (
    <main className="cy-page pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[480px] px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <header className="mb-6 flex items-center gap-4">
          <Link
            aria-label={common("close")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
            href={`/${locale}/wallet`}
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </header>

        <form
          aria-busy={processing}
          aria-live="polite"
          className="animate-fade-in-up space-y-4"
          onSubmit={handleSubmit}
        >
          <div className="cy-card p-4">
            <label
              className="mb-2 block text-sm font-semibold text-gray-300"
              htmlFor="token"
            >
              {t("selectToken")}
            </label>
            <select
              className="cy-input h-[52px]"
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
                <option value="">
                  {loading ? common("loading") : t("selectToken")}
                </option>
              ) : null}
              {balances.map((balance) => (
                <option key={balance.token.symbol} value={balance.token.symbol}>
                  {balance.token.symbol} ({formatBalance(balance.amount, locale)})
                </option>
              ))}
            </select>
            {loading ? (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500">
                <LoadingSpinner className="h-3 w-3" />
                {common("refreshing")}
              </p>
            ) : null}
          </div>

          <div className="cy-card p-4">
            <label
              className="mb-2 block text-sm font-semibold text-gray-300"
              htmlFor="recipient"
            >
              {t("recipientAddress")}
            </label>
            <div className="relative">
              <input
                autoCapitalize="none"
                autoComplete="off"
                className="cy-input pr-12"
                disabled={processing}
                id="recipient"
                onChange={(event) => setRecipient(event.target.value)}
                placeholder={t("recipientPlaceholder")}
                spellCheck={false}
                type="text"
                value={recipient}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                <ScanIcon />
              </span>
            </div>
          </div>

          <div className="cy-card p-4">
            <label
              className="mb-2 block text-sm font-semibold text-gray-300"
              htmlFor="amount"
            >
              {t("amount")}
            </label>
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900 px-4 py-3 focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/20">
              <div className="flex items-center justify-between gap-3">
                <input
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-gray-600"
                  disabled={processing}
                  id="amount"
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  pattern="[0-9]*[.,]?[0-9]*"
                  placeholder="0.00"
                  type="text"
                  value={amount}
                />
                <span className="shrink-0 text-sm font-semibold text-gray-500">
                  {selectedToken?.symbol ?? "cUAH"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs text-gray-500">
                  {t("balance")}:{" "}
                  {selectedBalance
                    ? `${formatBalance(selectedBalance.amount, locale)} ${selectedBalance.token.symbol}`
                    : "0"}
                </span>
                <Button
                  className="min-h-0 shrink-0 rounded-lg px-2 py-1 text-xs"
                  disabled={!selectedBalance || processing}
                  onClick={setMaxAmount}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t("max")}
                </Button>
              </div>
            </div>
            {numericAmount > 0 && !hasEnoughBalance ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {t("insufficientBalance")}
              </p>
            ) : null}
          </div>

          <div className="cy-card p-4">
            <label
              className="mb-2 block text-sm font-semibold text-gray-300"
              htmlFor="memo"
            >
              {t("memo")}
            </label>
            <input
              className="cy-input"
              disabled={processing}
              id="memo"
              onChange={(event) => setMemo(event.target.value)}
              placeholder={t("memoPlaceholder")}
              type="text"
              value={memo}
            />
          </div>

          {!connected ? (
            <p className="rounded-2xl border border-accent-500/25 bg-accent-500/10 px-4 py-3 text-sm leading-6 text-accent-100">
              {t("connectWalletFirst")}
            </p>
          ) : null}

          {success ? (
            <p
              className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-100"
              role="status"
            >
              {t("readyMessage")}
            </p>
          ) : null}

          <Button
            className="mt-2 h-[52px] rounded-2xl"
            disabled={!canSend}
            fullWidth
            isLoading={processing}
            loadingText={t("processing")}
            size="md"
            type="submit"
          >
            {t("button")}
          </Button>
        </form>
      </div>
    </main>
  );
}
