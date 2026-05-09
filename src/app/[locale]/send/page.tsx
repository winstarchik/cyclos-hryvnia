"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction as SolanaTransaction,
} from "@solana/web3.js";
import { useSignAndSendTransaction } from "@web3auth/modal/react/solana";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TOKENS } from "@/constants/tokens";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import { getInjectedSolanaWallet } from "@/lib/injectedSolana";
import { connection as defaultSolanaConnection } from "@/lib/solana";
import type { Balance, Token } from "@/types";

const TOKEN_PRICE_USD: Record<string, number> = {
  cUAH: 0.024,
  SOL: 150,
  USDC: 1,
  WBTC: 65_000,
};

const SOLANA_EXPLORER_URL = "https://explorer.solana.com/tx";

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

function amountToBaseUnits(value: string, decimals: number): bigint | null {
  const normalized = value.replace(",", ".").trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const [wholePart, decimalPart = ""] = normalized.split(".");
  const fractionalPart = decimalPart.padEnd(decimals, "0").slice(0, decimals);
  const base = BigInt(10) ** BigInt(decimals);

  return BigInt(wholePart || "0") * base + BigInt(fractionalPart || "0");
}

function formatNumberInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return Number(value.toFixed(6)).toString();
}

function getTokenPriceUSD(token?: Token): number {
  if (!token) return 0;
  return token.price ?? TOKEN_PRICE_USD[token.symbol] ?? 0;
}

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function isSendableToken(token: Token): boolean {
  return token.symbol === TOKENS.SOL.symbol;
}

function uniqueTokenOptions(balances: Balance[]): Token[] {
  const tokenMap = new Map<string, Token>();

  tokenMap.set(TOKENS.SOL.symbol, {
    ...TOKENS.SOL,
    price: TOKEN_PRICE_USD.SOL,
  });

  const solBalance = balances.find(
    (balance) => balance.token.symbol === TOKENS.SOL.symbol,
  );

  if (solBalance) {
    tokenMap.set(TOKENS.SOL.symbol, {
      ...solBalance.token,
      price: getTokenPriceUSD(solBalance.token),
    });
  }

  return Array.from(tokenMap.values());
}

export default function SendPage() {
  const t = useTranslations("send");
  const common = useTranslations("common");
  const locale = useLocale();
  const { address, connected, connection, provider } = useWallet();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { balances, loading, refetch } = useBalance();
  const [recipient, setRecipient] = useState("");
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS.SOL);
  const [amount, setAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [processing, setProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const tokenOptions = useMemo(() => uniqueTokenOptions(balances), [balances]);
  const activeConnection = connection ?? defaultSolanaConnection;

  useEffect(() => {
    if (tokenOptions.some((token) => token.symbol === selectedToken.symbol)) {
      return;
    }

    setSelectedToken(tokenOptions[0] ?? TOKENS.SOL);
  }, [selectedToken.symbol, tokenOptions]);

  useEffect(() => {
    const selectedBalanceToken = balances.find(
      (balance) => balance.token.symbol === selectedToken.symbol,
    )?.token;

    if (selectedBalanceToken) {
      setSelectedToken((currentToken) => ({
        ...currentToken,
        ...selectedBalanceToken,
        price: selectedBalanceToken.price ?? getTokenPriceUSD(currentToken),
      }));
    }
  }, [balances, selectedToken.symbol]);

  useEffect(() => {
    setSubmitError(null);
    setTxSignature(null);
  }, [recipient, selectedToken, amount, usdAmount, memo]);

  const selectedBalance = useMemo(
    () =>
      balances.find(
        (balance) => balance.token.symbol === selectedToken.symbol,
      ),
    [balances, selectedToken],
  );
  const tokenPriceUSD = getTokenPriceUSD(selectedToken);
  const numericAmount = normalizeAmount(amount);
  const numericUSD = normalizeAmount(usdAmount);
  const recipientIsInvalid =
    Boolean(recipient.trim()) && !isValidPublicKey(recipient.trim());
  const unsupportedSelectedToken = !isSendableToken(selectedToken);
  const hasEnoughBalance =
    selectedBalance !== undefined && numericAmount <= selectedBalance.amount;
  const canSend =
    connected &&
    Boolean(address) &&
    Boolean(activeConnection) &&
    Boolean(recipient.trim()) &&
    !recipientIsInvalid &&
    numericAmount > 0 &&
    hasEnoughBalance &&
    !unsupportedSelectedToken &&
    !processing;

  function handleTokenChange(symbol: string) {
    const nextToken =
      tokenOptions.find((token) => token.symbol === symbol) ??
      tokenOptions[0] ??
      TOKENS.SOL;
    const nextPrice = getTokenPriceUSD(nextToken);

    setSelectedToken(nextToken);
    if (numericUSD > 0 && nextPrice > 0) {
      setAmount(formatNumberInput(numericUSD / nextPrice));
    } else if (numericAmount > 0 && nextPrice > 0) {
      setUsdAmount(formatNumberInput(numericAmount * nextPrice));
    }
  }

  function handleTokenAmountChange(value: string) {
    setAmount(value);
    const parsedAmount = normalizeAmount(value);

    if (parsedAmount > 0 && tokenPriceUSD > 0) {
      setUsdAmount(formatNumberInput(parsedAmount * tokenPriceUSD));
    } else {
      setUsdAmount("");
    }
  }

  function handleUsdAmountChange(value: string) {
    setUsdAmount(value);
    const parsedUSD = normalizeAmount(value);

    if (parsedUSD > 0 && tokenPriceUSD > 0) {
      setAmount(formatNumberInput(parsedUSD / tokenPriceUSD));
    } else {
      setAmount("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend) return;

    setProcessing(true);
    setSubmitError(null);
    setTxSignature(null);

    try {
      if (!address || !activeConnection) {
        throw new Error(t("connectWalletFirst"));
      }

      const fromPublicKey = new PublicKey(address);
      const toPublicKey = new PublicKey(recipient.trim());
      const transaction = new SolanaTransaction();

      if (selectedToken.symbol !== TOKENS.SOL.symbol) {
        throw new Error(t("unsupportedToken"));
      }

      const lamports = amountToBaseUnits(amount, 9);

      if (!lamports || lamports <= BigInt(0)) {
        throw new Error(t("invalidAmount"));
      }

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          lamports: Number(lamports),
          toPubkey: toPublicKey,
        }),
      );

      const latestBlockhash = await activeConnection.getLatestBlockhash(
        "confirmed",
      );
      transaction.feePayer = fromPublicKey;
      transaction.recentBlockhash = latestBlockhash.blockhash;

      let signature: string;

      if (provider === "web3auth") {
        signature = await signAndSendTransaction(transaction);
      } else {
        const injectedWallet = getInjectedSolanaWallet();

        if (!injectedWallet) {
          throw new Error(t("connectWalletFirst"));
        }

        if (injectedWallet.provider.signAndSendTransaction) {
          const result =
            await injectedWallet.provider.signAndSendTransaction(transaction);
          signature = typeof result === "string" ? result : result.signature;
        } else if (injectedWallet.provider.signTransaction) {
          const signedTransaction =
            await injectedWallet.provider.signTransaction(transaction);
          signature = await activeConnection.sendRawTransaction(
            signedTransaction.serialize(),
          );
        } else {
          throw new Error(t("sendError"));
        }
      }

      await activeConnection.confirmTransaction(
        {
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          signature,
        },
        "confirmed",
      );

      setTxSignature(signature);
      setAmount("");
      setUsdAmount("");
      setMemo("");
      await refetch();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to send transaction", error);
      }

      setSubmitError(error instanceof Error ? error.message : t("sendError"));
    } finally {
      setProcessing(false);
    }
  }

  function setMaxAmount() {
    if (selectedBalance) {
      const maxAmount = String(selectedBalance.amount);
      setAmount(maxAmount);
      if (tokenPriceUSD > 0) {
        setUsdAmount(formatNumberInput(selectedBalance.amount * tokenPriceUSD));
      }
    }
  }

  function getTokenBalance(symbol: string): Balance | undefined {
    return balances.find(
      (balance) => balance.token.symbol.toLowerCase() === symbol.toLowerCase(),
    );
  }

  async function pasteRecipientFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setRecipient(text.trim());
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to read recipient from clipboard", error);
      }
      setSubmitError(t("clipboardError"));
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
              disabled={processing}
              id="token"
              onInput={(event) => handleTokenChange(event.currentTarget.value)}
              onChange={(event) => handleTokenChange(event.target.value)}
              value={selectedToken.symbol}
            >
              {tokenOptions.map((token) => {
                const tokenBalance = getTokenBalance(token.symbol);
                return (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                  {tokenBalance
                    ? ` (${formatBalance(tokenBalance.amount, locale)})`
                    : ""}
                </option>
                );
              })}
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
              <button
                aria-label={t("pasteAddress")}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white/[0.06] hover:text-white"
                disabled={processing}
                onClick={pasteRecipientFromClipboard}
                type="button"
              >
                <ScanIcon />
              </button>
            </div>
            {recipientIsInvalid ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {t("invalidRecipient")}
              </p>
            ) : null}
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
                  onChange={(event) => handleTokenAmountChange(event.target.value)}
                  pattern="[0-9]*[.,]?[0-9]*"
                  placeholder="0.00"
                  type="text"
                  value={amount}
                />
                <span className="shrink-0 text-sm font-semibold text-gray-500">
                  {selectedToken.symbol}
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
            {unsupportedSelectedToken ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {t("unsupportedToken")}
              </p>
            ) : null}
          </div>

          <div className="cy-card p-4">
            <label
              className="mb-2 block text-sm font-semibold text-gray-300"
              htmlFor="usdAmount"
            >
              {t("amountUsd")}
            </label>
            <div className="rounded-2xl border border-white/[0.08] bg-dark-900 px-4 py-3 focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/20">
              <div className="flex items-center justify-between gap-3">
                <input
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-gray-600"
                  disabled={processing || tokenPriceUSD === 0}
                  id="usdAmount"
                  inputMode="decimal"
                  onChange={(event) => handleUsdAmountChange(event.target.value)}
                  pattern="[0-9]*[.,]?[0-9]*"
                  placeholder="0.00"
                  type="text"
                  value={usdAmount}
                />
                <span className="shrink-0 text-sm font-semibold text-gray-500">
                  USD
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {tokenPriceUSD > 0
                  ? t("priceHint", {
                      price: `$${tokenPriceUSD.toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}`,
                      symbol: selectedToken.symbol,
                    })
                  : t("priceUnavailable")}
              </p>
            </div>
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
            <div className="rounded-2xl border border-accent-500/25 bg-accent-500/10 p-4 text-sm leading-6 text-accent-100">
              <p>{t("connectWalletFirst")}</p>
              <Link
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white transition hover:bg-accent-600"
                href={`/${locale}`}
              >
                {t("connectWalletAction")}
              </Link>
            </div>
          ) : null}

          {submitError ? (
            <p
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          {txSignature ? (
            <div
              className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-100"
              role="status"
            >
              <p>{t("transactionSent")}</p>
              <a
                className="mt-2 inline-flex font-semibold text-green-50 underline-offset-4 hover:underline"
                href={`${SOLANA_EXPLORER_URL}/${txSignature}`}
                rel="noreferrer"
                target="_blank"
              >
                {t("viewOnExplorer")}
              </a>
            </div>
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
