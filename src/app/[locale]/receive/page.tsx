"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type * as QRCodeReact from "qrcode.react";
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

export default function ReceivePage() {
  const t = useTranslations();
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleCopy() {
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-dark-950 px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6 text-white">
      <div className="animate-scale-in w-full max-w-sm text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-normal">
          {t("receive.title")}
        </h1>
        <p className="mb-8 text-gray-400">{t("receive.subtitle")}</p>

        <div className="mb-8 w-full max-w-sm rounded-3xl border border-dark-800 bg-gradient-to-br from-dark-900/50 to-dark-950/50 p-5 shadow-2xl shadow-accent-500/5 backdrop-blur-xl transition hover:border-accent-500 sm:p-8">
          <div className="mx-auto rounded-2xl bg-white p-3">
            <QRCode
              className="h-auto w-full max-w-full"
              includeMargin
              level="H"
              size={256}
              title={t("receive.walletAddress")}
              value={address || ""}
            />
          </div>
        </div>

        <div className="mb-6 w-full max-w-sm rounded-2xl border border-dark-800 bg-dark-900/30 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            {t("receive.walletAddress")}
          </p>
          <p className="select-all break-all font-mono text-sm text-accent-400">
            {address || ""}
          </p>
        </div>

        <button
          aria-live="polite"
          className={`w-full max-w-sm rounded-xl py-3 font-semibold text-white transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-400/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
            copied
              ? "bg-green-500"
              : "bg-accent-500 hover:bg-accent-600"
          }`}
          disabled={!address}
          onClick={handleCopy}
          type="button"
        >
          {copied ? `\u2713 ${t("common.copied")}` : t("receive.copyAddress")}
        </button>

        {copyError ? (
          <p
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
            role="alert"
          >
            {t("receive.copyError")}
          </p>
        ) : null}
      </div>
    </main>
  );
}
