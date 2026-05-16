"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import type * as QRCodeReact from "qrcode.react";
import { Button } from "@/components/common/Button";
import { useWallet } from "@/hooks/useWallet";
import { unlockOrCreateCyclosWallet } from "@/lib/clientWallet";

type QRCodeCanvasProps = ComponentProps<typeof QRCodeReact.QRCodeCanvas>;

const QRCode = dynamic<QRCodeCanvasProps>(
  () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
  { ssr: false },
);

export default function WalletExportPage() {
  const locale = useLocale();
  const { address, email, provider } = useWallet();
  const [password, setPassword] = useState("");
  const [exportPayload, setExportPayload] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const canExport = provider === "email" && Boolean(email);
  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }, [address]);

  async function handleExport() {
    if (!email || !password) return;

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const wallet = await unlockOrCreateCyclosWallet(email, password);
      setExportPayload(`CYCLOS_EXPORT_V1:${wallet.secretKeyBase64}`);
    } catch (exportError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Wallet export failed:", exportError);
      }
      setError("Could not unlock this wallet. Check the wallet password and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPayload() {
    if (!exportPayload) return;

    await navigator.clipboard.writeText(exportPayload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="cy-page min-h-screen px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-[480px]">
        <div className="mb-6 flex items-center gap-3">
          <Link
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-xl text-white"
            href={`/${locale}/wallet`}
          >
            ←
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent-400">
              Mobile import
            </p>
            <h1 className="mt-1 text-3xl font-black">Export Cyclos wallet</h1>
          </div>
        </div>

        <div className="cy-card-soft space-y-5 p-5">
          <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100">
            This export contains the private key for {shortAddress || "your wallet"}.
            Anyone who gets it can spend the funds. Use it only inside your own
            Cyclos APK import screen.
          </div>

          {!canExport ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
              Only the Cyclos email wallet can be exported from this page.
              External wallets like Phantom must be imported through their own
              seed phrase or private key tools.
            </div>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                  Wallet password
                </span>
                <input
                  autoComplete="current-password"
                  className="input-base min-h-12 w-full"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter wallet password"
                  type="password"
                  value={password}
                />
              </label>

              <Button
                disabled={!password || loading}
                fullWidth
                isLoading={loading}
                loadingText="Unlocking..."
                onClick={() => void handleExport()}
                type="button"
              >
                Generate APK import key
              </Button>
            </>
          )}

          {error ? (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
              {error}
            </p>
          ) : null}

          {exportPayload ? (
            <div className="space-y-4">
              <div className="mx-auto w-full max-w-[300px] rounded-[28px] border border-white/[0.08] bg-white p-4">
                <QRCode
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin={false}
                  level="H"
                  size={268}
                  value={exportPayload}
                />
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                  APK import key
                </span>
                <textarea
                  className="input-base min-h-28 w-full resize-none break-all font-mono text-xs"
                  readOnly
                  value={exportPayload}
                />
              </label>

              <Button fullWidth onClick={() => void copyPayload()} type="button">
                {copied ? "Copied" : "Copy import key"}
              </Button>

              <p className="text-center text-xs leading-5 text-gray-500">
                APK: Create/Import wallet → Import existing wallet → Web wallet → Paste.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
