"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type * as QRCodeReact from "qrcode.react";
import { TOKENS } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import type { Token } from "@/types";

type QRCodeCanvasProps = ComponentProps<typeof QRCodeReact.QRCodeCanvas>;

const QRCode = dynamic<QRCodeCanvasProps>(
  () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
  {
    loading: () => (
      <div
        aria-busy="true"
        className="aspect-square w-full animate-pulse rounded-2xl bg-dark-800"
        role="status"
      />
    ),
    ssr: false,
  },
);

const RECEIVE_TOKENS: Token[] = [TOKENS.cUAH, TOKENS.SOL].map((token) => ({
  ...token,
}));

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

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="10"
        x="9"
        y="7"
      />
      <path
        d="M6 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 16V4m0 0 4 4m-4-4L8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function TokenLogo({ token, size = 48 }: { token: Token; size?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isCuah = token.symbol === "cUAH";

  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_25%,#78a0ff,#2d49d8_55%,#16205f)] text-sm font-bold text-white shadow-[0_0_26px_rgba(65,105,225,0.45)]"
      style={{ height: size, width: size }}
    >
      {token.logo && !imageFailed ? (
        <Image
          alt={`${token.symbol} logo`}
          className="rounded-full object-cover"
          height={size}
          onError={() => setImageFailed(true)}
          sizes={`${size}px`}
          src={token.logo}
          width={size}
        />
      ) : (
        <span className={isCuah ? "text-3xl" : "text-sm"}>
          {isCuah ? "₴" : token.symbol.slice(0, 3)}
        </span>
      )}
    </span>
  );
}

export default function ReceivePage() {
  const t = useTranslations();
  const locale = useLocale();
  const { address, walletLocked } = useWallet();
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS.cUAH);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const qrValue = address ?? "";
  const addressLabel = address ? shortAddress(address) : t("receive.connectFirst");
  const onlySendText = useMemo(
    () => t("receive.onlySendToken", { symbol: selectedToken.symbol }),
    [selectedToken.symbol, t],
  );

  async function copyAddress() {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to copy address", error);
      }
      setCopyError(true);
    }
  }

  async function shareAddress() {
    if (!address) return;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${selectedToken.symbol} ${t("receive.walletAddress")}`,
          text: address,
        });
        return;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to share address", error);
        }
      }
    }

    await copyAddress();
  }

  return (
    <main className="cy-page pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto min-h-dvh w-full max-w-[390px] px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <header className="mb-6 flex items-center gap-4">
          <Link
            aria-label={t("common.close")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
            href={`/${locale}/wallet`}
          >
            <BackIcon />
          </Link>
          <h1 className="text-xl font-semibold text-white">
            {t("receive.title")}
          </h1>
        </header>

        <section className="animate-scale-in space-y-6">
          <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
            <button
              aria-expanded={tokenPickerOpen}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl text-left transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60"
              onClick={() => setTokenPickerOpen((open) => !open)}
              type="button"
            >
              <TokenLogo token={selectedToken} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-white">
                  {selectedToken.symbol}
                </span>
                <span className="mt-1 block truncate text-sm text-gray-500">
                  {selectedToken.name}
                </span>
              </span>
              <span className="pr-1 text-gray-400">
                <ChevronIcon open={tokenPickerOpen} />
              </span>
            </button>

            {tokenPickerOpen ? (
              <div
                className="absolute left-3 right-3 top-[calc(100%-0.25rem)] z-30 overflow-hidden rounded-2xl border border-white/[0.1] bg-dark-900/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
                role="listbox"
              >
                {RECEIVE_TOKENS.map((token) => (
                  <button
                    aria-selected={token.symbol === selectedToken.symbol}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06] aria-selected:bg-accent-500/15"
                    key={token.symbol}
                    onClick={() => {
                      setSelectedToken(token);
                      setTokenPickerOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    <TokenLogo token={token} size={40} />
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

          <div className="rounded-[1.65rem] border border-white/[0.07] bg-[#111825] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)]">
            <div className="relative rounded-[1.25rem] bg-white p-3">
              {address ? (
                <>
                  <QRCode
                    className="h-auto w-full max-w-full"
                    includeMargin={false}
                    level="H"
                    size={260}
                    title={t("receive.walletAddress")}
                    value={qrValue}
                  />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[7px] border-white bg-white shadow-lg">
                    <TokenLogo token={selectedToken} size={62} />
                  </span>
                </>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-dark-900 p-6 text-center text-sm leading-6 text-gray-400">
                  {t("receive.connectFirst")}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-gray-400">
              {t("receive.walletAddress")}
            </p>
            <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4">
              <p className="min-w-0 flex-1 select-all truncate font-mono text-base font-semibold text-white">
                {addressLabel}
              </p>
              <button
                aria-label={t("receive.copyAddress")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!address}
                onClick={copyAddress}
                type="button"
              >
                <CopyIcon />
              </button>
            </div>
          </div>

          <p className="text-center text-sm leading-6 text-gray-400">
            {onlySendText}
          </p>

          {walletLocked ? (
            <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Sign in again to unlock sending from this Cyclos wallet.
            </p>
          ) : null}

          {copyError ? (
            <p
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
              role="alert"
            >
              {t("receive.copyError")}
            </p>
          ) : null}

          {address ? (
            <button
              className="group flex min-h-16 w-full items-center gap-5 rounded-2xl border border-accent-500/50 bg-dark-900/60 p-2 text-white shadow-[0_0_30px_rgba(59,111,255,0.12)] transition hover:border-accent-400 hover:bg-dark-800/70"
              onClick={shareAddress}
              type="button"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-[0_12px_34px_rgba(59,111,255,0.45)] transition group-hover:bg-accent-400">
                <ShareIcon />
              </span>
              <span className="flex-1 pr-10 text-center text-base font-semibold">
                {copied ? t("common.copied") : t("receive.shareAddress")}
              </span>
            </button>
          ) : (
            <Link
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 px-6 py-3 text-base font-semibold text-white transition hover:from-accent-600 hover:to-accent-700"
              href={`/${locale}/email-login?mode=login`}
            >
              {t("onboarding.login")}
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
