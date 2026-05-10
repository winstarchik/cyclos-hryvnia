"use client";

import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type * as QRCodeReact from "qrcode.react";
import { Button } from "@/components/common/Button";
import { TOKENS } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import type { Token } from "@/types";

type QRCodeCanvasProps = ComponentProps<typeof QRCodeReact.QRCodeCanvas>;
type ReceiveMode = "address" | "invoice";

const QRCode = dynamic<QRCodeCanvasProps>(
  () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
  {
    loading: () => (
      <div
        aria-busy="true"
        className="mx-auto aspect-square w-full max-w-[256px] animate-pulse rounded-xl bg-dark-800"
        role="status"
      >
        <span className="sr-only">Loading QR code</span>
      </div>
    ),
    ssr: false,
  },
);

const RECEIVE_TOKENS: Token[] = [
  TOKENS.cUAH,
  TOKENS.SOL,
  TOKENS.USDC,
  TOKENS.USDT,
  TOKENS.WBTC,
  TOKENS.WETH,
].map((token) => ({ ...token }));

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeAmount(value: string): string {
  return value.trim().replace(",", ".");
}

function canUseTokenInSolanaPay(token: Token): boolean {
  if (token.symbol === "SOL") return true;

  return isValidPublicKey(token.address);
}

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function TokenLogo({ token }: { token: Token }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-500 text-xs font-bold text-white shadow-lg shadow-accent-500/20">
      {token.logo && !imageFailed ? (
        <Image
          alt={`${token.symbol} logo`}
          className="rounded-full object-cover"
          height={44}
          loading="lazy"
          onError={() => setImageFailed(true)}
          sizes="44px"
          src={token.logo}
          width={44}
        />
      ) : (
        token.symbol.slice(0, 4)
      )}
    </span>
  );
}

export default function ReceivePage() {
  const t = useTranslations();
  const locale = useLocale();
  const {
    address,
    connectWallet,
    error: walletError,
    loading: walletLoading,
  } = useWallet();
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS.cUAH);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>("address");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    setInvoiceReference(Keypair.generate().publicKey.toBase58());
  }, []);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const normalizedInvoiceAmount = normalizeAmount(invoiceAmount);
  const parsedInvoiceAmount = Number(normalizedInvoiceAmount);
  const hasInvoiceAmount = normalizedInvoiceAmount.length > 0;
  const isInvoiceAmountValid =
    !hasInvoiceAmount ||
    (Number.isFinite(parsedInvoiceAmount) && parsedInvoiceAmount > 0);
  const canEncodeSelectedToken = canUseTokenInSolanaPay(selectedToken);

  const qrValue = useMemo(() => {
    if (!address) return "";

    if (
      receiveMode === "address" ||
      !isInvoiceAmountValid ||
      !canEncodeSelectedToken
    ) {
      return address;
    }

    const params = new URLSearchParams();
    if (hasInvoiceAmount) {
      params.set("amount", normalizedInvoiceAmount);
    }
    if (selectedToken.symbol !== "SOL") {
      params.set("spl-token", selectedToken.address);
    }
    if (invoiceReference) {
      params.set("reference", invoiceReference);
    }
    params.set("label", "Cyclos Hryvnia");
    if (invoiceMemo.trim()) {
      params.set("message", invoiceMemo.trim());
    }

    const query = params.toString();
    return query ? `solana:${address}?${query}` : `solana:${address}`;
  }, [
    address,
    canEncodeSelectedToken,
    hasInvoiceAmount,
    invoiceMemo,
    invoiceReference,
    isInvoiceAmountValid,
    normalizedInvoiceAmount,
    receiveMode,
    selectedToken.address,
    selectedToken.symbol,
  ]);

  function refreshInvoiceReference() {
    setInvoiceReference(Keypair.generate().publicKey.toBase58());
    setCopied(false);
    setCopyError(false);
  }

  async function copyReceiveValue() {
    if (!address || !qrValue) return;

    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setCopyError(false);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to copy receive value", error);
      }
      setCopyError(true);
    }
  }

  async function handleShare() {
    if (!address || !qrValue) return;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          text: qrValue,
          title:
            receiveMode === "invoice"
              ? t("receive.paymentRequest")
              : t("receive.walletAddress"),
        });
        return;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to share receive value", error);
        }
      }
    }

    await copyReceiveValue();
  }

  return (
    <main className="cy-page pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <header className="mb-6 flex items-center gap-4">
          <Link
            aria-label={t("common.close")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
            href={`/${locale}/wallet`}
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              {t("receive.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("receive.subtitle")}
            </p>
          </div>
        </header>

        <section className="animate-scale-in flex flex-col items-center pb-8 text-center">
          <div className="mb-4 grid w-full grid-cols-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
            {(["address", "invoice"] as const).map((mode) => (
              <button
                className={`min-h-11 rounded-xl text-sm font-semibold transition ${
                  receiveMode === mode
                    ? "bg-accent-500 text-white shadow-lg shadow-accent-500/20"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                }`}
                key={mode}
                onClick={() => setReceiveMode(mode)}
                type="button"
              >
                {t(
                  `receive.${
                    mode === "address" ? "modeAddress" : "modeInvoice"
                  }`,
                )}
              </button>
            ))}
          </div>

          <div className="relative mb-5 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
            <span className="sr-only" id="receive-token-label">
              {t("send.selectToken")}
            </span>
            <button
              aria-controls="receive-token-list"
              aria-expanded={tokenPickerOpen}
              aria-labelledby="receive-token-label"
              className="flex min-h-14 w-full items-center gap-3 rounded-xl px-1 text-left transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60"
              onClick={() => setTokenPickerOpen((open) => !open)}
              type="button"
            >
              <TokenLogo token={selectedToken} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {selectedToken.symbol}
                </span>
                <span className="mt-1 block truncate text-xs text-gray-500">
                  {selectedToken.name}
                </span>
              </span>
              <span className="text-gray-400">
                <ChevronIcon open={tokenPickerOpen} />
              </span>
            </button>

            {tokenPickerOpen ? (
              <div
                className="absolute left-3 right-3 top-[calc(100%-0.25rem)] z-30 overflow-hidden rounded-2xl border border-white/[0.1] bg-dark-900/95 p-1 text-left shadow-2xl shadow-black/40 backdrop-blur-xl"
                id="receive-token-list"
                role="listbox"
              >
                {RECEIVE_TOKENS.map((token) => (
                  <button
                    aria-selected={token.symbol === selectedToken.symbol}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06] aria-selected:bg-accent-500/15"
                    key={token.symbol}
                    onClick={() => {
                      setSelectedToken(token);
                      setTokenPickerOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    <TokenLogo token={token} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">
                        {token.symbol}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {token.name}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {receiveMode === "invoice" ? (
            <div className="mb-5 w-full space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-accent-400">
                  {t("receive.invoiceAmount")}
                </span>
                <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/[0.08] bg-dark-900 px-4">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-gray-600"
                    inputMode="decimal"
                    onChange={(event) => setInvoiceAmount(event.target.value)}
                    placeholder={t("receive.invoiceAmountPlaceholder")}
                    type="text"
                    value={invoiceAmount}
                  />
                  <span className="text-sm font-semibold text-gray-400">
                    {selectedToken.symbol}
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-accent-400">
                  {t("receive.invoiceMemo")}
                </span>
                <input
                  className="cy-input"
                  maxLength={80}
                  onChange={(event) => setInvoiceMemo(event.target.value)}
                  placeholder={t("receive.invoiceMemoPlaceholder")}
                  type="text"
                  value={invoiceMemo}
                />
              </label>

              <div className="rounded-2xl border border-white/[0.07] bg-dark-900/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                      {t("receive.invoiceReference")}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-accent-400">
                      {invoiceReference || "..."}
                    </p>
                  </div>
                  <Button
                    onClick={refreshInvoiceReference}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {t("receive.refreshInvoice")}
                  </Button>
                </div>
              </div>

              {!isInvoiceAmountValid ? (
                <p className="text-sm leading-6 text-red-200" role="alert">
                  {t("send.invalidAmount")}
                </p>
              ) : null}

              {!canEncodeSelectedToken ? (
                <p className="text-sm leading-6 text-amber-200" role="alert">
                  {t("receive.invoiceUnsupportedToken", {
                    symbol: selectedToken.symbol,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mb-6 w-full max-w-[360px] rounded-[1.4rem] border border-white/[0.07] bg-[#111825] p-5 shadow-2xl shadow-black/20">
            <div className="mx-auto rounded-2xl bg-white p-3">
              {address ? (
                <QRCode
                  className="h-auto w-full max-w-full"
                  includeMargin
                  level="H"
                  size={receiveMode === "invoice" ? 232 : 256}
                  title={t("receive.walletAddress")}
                  value={qrValue}
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-dark-900 p-6 text-sm leading-6 text-gray-400">
                  {t("receive.connectFirst")}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              {receiveMode === "invoice"
                ? t("receive.paymentRequest")
                : t("receive.walletAddress")}
            </p>
            <p className="select-all break-all font-mono text-sm leading-6 text-accent-400">
              {address ? qrValue : t("receive.connectFirst")}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            <Button
              aria-live="polite"
              disabled={!address}
              fullWidth
              onClick={copyReceiveValue}
              size="md"
              type="button"
              variant={copied ? "success" : "primary"}
            >
              {copied
                ? `✓ ${t("common.copied")}`
                : receiveMode === "invoice"
                  ? t("receive.copyPaymentLink")
                  : t("receive.copyAddress")}
            </Button>
            <Button
              disabled={!address}
              fullWidth
              onClick={handleShare}
              size="md"
              type="button"
              variant="secondary"
            >
              {receiveMode === "invoice"
                ? t("receive.sharePaymentLink")
                : t("receive.shareAddress")}
            </Button>
          </div>

          <p className="mt-5 text-xs leading-5 text-gray-500">
            {receiveMode === "invoice"
              ? t("receive.invoiceQrHint")
              : t("receive.onlySendToken", { symbol: selectedToken.symbol })}
          </p>

          {!address ? (
            <Button
              className="mt-4 max-w-[220px]"
              disabled={walletLoading}
              fullWidth
              isLoading={walletLoading}
              onClick={() => void connectWallet()}
              size="md"
              type="button"
              variant="primary"
            >
              {t("send.connectWalletAction")}
            </Button>
          ) : null}

          {!address && walletError ? (
            <p
              className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
              role="alert"
            >
              {walletError}
            </p>
          ) : null}

          {copyError ? (
            <p
              className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
              role="alert"
            >
              {t("receive.copyError")}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
