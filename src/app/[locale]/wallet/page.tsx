"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { MarketCharts } from "@/components/market/MarketCharts";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { TokenList } from "@/components/wallet/TokenList";
import { useBalance } from "@/hooks/useBalance";
import { useTransactions } from "@/hooks/useTransactions";
import { useWallet } from "@/hooks/useWallet";
import type { Transaction } from "@/types";

type WalletTab = "market" | "assets" | "activity";

/* ── Skeleton rows ─────────────────────────────────────────── */
function RowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.07]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="h-3 w-16 animate-pulse rounded-full bg-white/[0.05]" />
          </div>
          <div className="space-y-2 text-right">
            <div className="ml-auto h-4 w-20 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="ml-auto h-3 w-14 animate-pulse rounded-full bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Transaction row ───────────────────────────────────────── */
function TxRow({ tx, i }: { tx: Transaction; i: number }) {
  const isReceive = tx.type === "receive";
  const isSwap    = tx.type === "swap";

  return (
    <div
      className="animate-fade-in-up token-card flex items-center gap-3"
      style={{ animationDelay: `${i * 35}ms` }}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold
        ${isReceive ? "bg-green-500/15 text-green-400"
         : isSwap   ? "bg-accent-500/15 text-accent-400"
                    : "bg-red-500/15 text-red-400"}`}
      >
        {isReceive ? "↓" : isSwap ? "⇄" : "↑"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold capitalize text-white">{tx.type}</p>
        <p className="mt-0.5 text-[12px] text-[#3d5070]">
          {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <div className="max-w-[48%] shrink-0 text-right">
        <p className={`break-words text-[14px] font-semibold
          ${isReceive ? "text-green-400" : isSwap ? "text-accent-400" : "text-red-400"}`}
        >
          {isReceive ? "+" : isSwap ? "" : "−"}
          {tx.amount.toFixed(4)} {tx.token.symbol}
        </p>
        <p className="mt-0.5 text-[12px] text-[#3d5070]">${tx.valueUSD.toFixed(2)}</p>
      </div>
    </div>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" fill="none" height={16} viewBox="0 0 24 24" width={16}>
      <path
        d="M10 7V5.75A2.75 2.75 0 0 1 12.75 3h4.5A2.75 2.75 0 0 1 20 5.75v12.5A2.75 2.75 0 0 1 17.25 21h-4.5A2.75 2.75 0 0 1 10 18.25V17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M4 12h10m0 0-3.25-3.25M14 12l-3.25 3.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function WalletPage() {
  const t        = useTranslations("wallet");
  const historyT = useTranslations("history");
  const common   = useTranslations("common");
  const locale   = useLocale();
  const router   = useRouter();
  const { address, disconnect, loading: walletLoading } = useWallet();

  const { balances, error: balErr, loading: balLoading, refetch: refetchBal, totalValueUSD } = useBalance();
  const { transactions, error: txErr, loading: txLoading, refetch: refetchTx }               = useTransactions();

  const [tab, setTab] = useState<WalletTab>("market");
  const [signingOut, setSigningOut] = useState(false);

  const cuahBal = balances.find(b => b.token.symbol.toLowerCase() === "cuah");
  const initBal = balLoading && balances.length === 0;
  const initTx  = txLoading  && transactions.length === 0;

  const promoSub =
    locale === "ru" ? "Ваша цифровая гривна"
    : locale === "ua" ? "Ваша цифрова гривня"
    : "Your digital hryvnia";

  const tabs: Array<{ key: WalletTab; label: string }> = [
    { key: "market",   label: t("market")   },
    { key: "assets",   label: t("assets")   },
    { key: "activity", label: t("activity") },
  ];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await disconnect();
      router.replace(`/${locale}`);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="cy-page" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto w-full max-w-[480px]">

        {/* ── Header zone ── */}
        <header
          className="bg-gradient-to-b from-[#080f20] to-dark-950 px-4 pb-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          {/* top bar */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px]
                              bg-[radial-gradient(circle_at_35%_35%,#6b8fff,#2441a8)]">
                <span className="text-[13px] font-bold text-white">₴</span>
              </div>
              <span className="text-[14px] font-bold tracking-wider text-white">CYCLOS</span>
            </div>
            <div className="relative z-30 flex shrink-0 items-center gap-2">
              <Button
                aria-label={t("signOut")}
                className="min-h-9 rounded-xl border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.08] hover:text-white"
                disabled={walletLoading}
                isLoading={signingOut}
                loadingText={t("signingOut")}
                onClick={() => void handleSignOut()}
                size="sm"
                type="button"
                variant="ghost"
              >
                <SignOutIcon />
                <span>{t("signOut")}</span>
              </Button>
              <LanguageSwitcher className="shrink-0" />
            </div>
          </div>

          {/* balance card */}
          <BalanceCard
            address={address}
            loading={initBal}
            totalValueUSD={totalValueUSD}
            cuahAmount={cuahBal?.amount}
          />

          {/* promo banner */}
          <div className="mt-3 flex items-center justify-between rounded-2xl
                          border border-white/[0.05] bg-[#0b1220] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[#c0d4ff]">Cyclos Hryvnia</p>
              <p className="text-[12px] text-[#2e4268]">{promoSub}</p>
            </div>
            <div className="glow-blue flex h-10 w-10 items-center justify-center rounded-full
                            bg-[radial-gradient(circle_at_35%_35%,#6b8fff,#2441a8)]">
              <span className="text-[17px] font-bold text-white">₴</span>
            </div>
          </div>

          {/* tabs */}
          <div className="mt-3 flex gap-1 rounded-2xl border border-white/[0.05]
                          bg-[#0a1220] p-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key} type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-xl py-[9px] text-[13px] font-semibold transition-colors
                  ${tab === key
                    ? "bg-[#152045] text-accent-400"
                    : "text-[#3a4f6e] hover:text-[#7a8faa]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Content ── */}
        <section
          aria-busy={tab === "assets" ? balLoading : txLoading}
          className="px-4 pt-3"
        >
          {/* market */}
          {tab === "market" && <MarketCharts />}

          {/* assets */}
          {tab === "assets" && (
            <div>
              {balLoading && balances.length > 0 && (
                <p className="mb-2 inline-flex items-center gap-2 text-xs text-[#3a4f6e]" role="status">
                  <LoadingSpinner className="h-3 w-3" />
                  <span>{common("refreshing")}</span>
                </p>
              )}
              {initBal && <RowSkeleton />}
              {balErr && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100" role="alert">
                  <p>{t("loadError")}</p>
                  <Button className="mt-3 border-red-400/40 text-red-50 hover:bg-red-500/20"
                    onClick={() => void refetchBal()} size="sm" type="button" variant="ghost">
                    {common("retry")}
                  </Button>
                </div>
              )}
              {!balLoading && !balErr && balances.length === 0 && (
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02]
                                p-8 text-center text-sm text-[#3a4f6e]">
                  {t("emptyAssets")}
                </div>
              )}
              {!initBal && balances.length > 0 && <TokenList balances={balances} />}
            </div>
          )}

          {/* activity */}
          {tab === "activity" && (
            <div>
              {txLoading && transactions.length > 0 && (
                <p className="mb-2 inline-flex items-center gap-2 text-xs text-[#3a4f6e]" role="status">
                  <LoadingSpinner className="h-3 w-3" />
                  <span>{common("refreshing")}</span>
                </p>
              )}
              {initTx && <RowSkeleton count={3} />}
              {txErr && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100" role="alert">
                  <p>{historyT("loadError")}</p>
                  <Button className="mt-3 border-red-400/40 text-red-50 hover:bg-red-500/20"
                    onClick={() => void refetchTx()} size="sm" type="button" variant="ghost">
                    {common("retry")}
                  </Button>
                </div>
              )}
              {!txLoading && !txErr && transactions.length === 0 && (
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02]
                                p-8 text-center text-sm text-[#3a4f6e]">
                  {historyT("empty")}
                </div>
              )}
              {!initTx && transactions.length > 0 &&
                transactions.slice(0, 10).map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
