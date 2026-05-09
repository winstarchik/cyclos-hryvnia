"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type * as QRCodeReact from "qrcode.react";
import { Button } from "@/components/common/Button";
import { useWallet } from "@/hooks/useWallet";

type QRCodeCanvasProps = ComponentProps<typeof QRCodeReact.QRCodeCanvas>;

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

function CUAHIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 28 28">
      <circle cx="14" cy="14" fill="#4169e1" r="14" />
      <text
        dominantBaseline="middle"
        fill="white"
        fontSize="14"
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

export default function ReceivePage() {
  const t = useTranslations();
  const locale = useLocale();
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function copyAddress() {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setCopyError(false);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to copy wallet address", error);
      }
      setCopyError(true);
    }
  }

  async function handleShare() {
    if (!address) return;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          text: address,
          title: t("receive.walletAddress"),
        });
        return;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to share wallet address", error);
        }
      }
    }

    await copyAddress();
  }

  return (
    <main className="cy-page pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <header className="mb-6 flex items-center gap-4">
          <Link
            aria-label={t("common.close")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
            href={`/${locale}/wallet`}
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{t("receive.title")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("receive.subtitle")}</p>
          </div>
        </header>

        <section className="animate-scale-in flex flex-1 flex-col items-center justify-center pb-8 text-center">
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
            <CUAHIcon />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">cUAH</p>
              <p className="text-xs text-gray-500">{t("receive.network")}</p>
            </div>
          </div>

          <div className="mb-6 w-full rounded-[1.4rem] border border-white/[0.07] bg-[#111825] p-5 shadow-2xl shadow-black/20">
            <div className="mx-auto rounded-2xl bg-white p-3">
              {address ? (
                <QRCode
                  className="h-auto w-full max-w-full"
                  includeMargin
                  level="H"
                  size={256}
                  title={t("receive.walletAddress")}
                  value={address}
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
              {t("receive.walletAddress")}
            </p>
            <p className="select-all break-all font-mono text-sm leading-6 text-accent-400">
              {address || t("receive.connectFirst")}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            <Button
              aria-live="polite"
              disabled={!address}
              fullWidth
              onClick={copyAddress}
              size="md"
              type="button"
              variant={copied ? "success" : "primary"}
            >
              {copied ? `✓ ${t("common.copied")}` : t("receive.copyAddress")}
            </Button>
            <Button
              disabled={!address}
              fullWidth
              onClick={handleShare}
              size="md"
              type="button"
              variant="secondary"
            >
              {t("receive.shareAddress")}
            </Button>
          </div>

          <p className="mt-5 text-xs leading-5 text-gray-500">
            {t("receive.onlySend")}
          </p>

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
