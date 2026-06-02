"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useWallet } from "@/hooks/useWallet";
import { ForgePulse, ForgeSpotlight } from "@/components/common/ForgeUI";

interface BalanceCardProps {
  address: string | null;
  loading?: boolean;
  totalValueUSD: number;
  cuahAmount?: number;
  cuahChangePercent?: number;
}

function fmtUSD(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(v);
}
function fmtCUAH(v: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}
function fmtAddr(a: string | null) {
  if (!a) return "";
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function SendIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17 17 7M17 7H8M17 7v9" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ReceiveIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v14M5.5 12.5 12 19l6.5-6.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SwapIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.75 7.75A2.75 2.75 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-9a2.75 2.75 0 0 1-2.75-2.75v-8.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.25 12h4v4.25h-4A2.1 2.1 0 0 1 13.15 14v-.05A2.1 2.1 0 0 1 15.25 12Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BalanceSkeleton() {
  return (
    <div aria-busy="true" role="status" className="balance-card-bg animate-fade-in rounded-[29px_17px_29px_17px] p-[27px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 w-44 animate-pulse rounded-xl bg-white/10" />
          <div className="h-3 w-32 animate-pulse rounded-full bg-white/[0.07]" />
        </div>
        <div className="h-[52px] w-[52px] animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-[62px] animate-pulse rounded-2xl bg-white/[0.06]" />
        ))}
      </div>
      <span className="sr-only">Loading balance…</span>
    </div>
  );
}

export function BalanceCard({
  address, loading = false, totalValueUSD, cuahAmount = 0, cuahChangePercent,
}: BalanceCardProps) {
  const t      = useTranslations("wallet");
  const locale = useLocale();
  const {
    connectWallet,
    loading: walletLoading,
    error: walletError,
    clearError,
  } = useWallet();

  if (loading) return <BalanceSkeleton />;

  const isUp = cuahChangePercent !== undefined && cuahChangePercent >= 0;

  const extra =
    locale === "ru" ? { swap: "Обмен",  wallet: "Кошелёк" }
    : locale === "ua" ? { swap: "Обмін", wallet: "Гаманець" }
    :                   { swap: "Swap",  wallet: "Wallet"   };

  const actions = [
    { href: `/${locale}/send`,    label: t("send"),       Icon: SendIcon    },
    { href: `/${locale}/receive`, label: t("receive"),    Icon: ReceiveIcon },
    { href: `/${locale}/send`,    label: extra.swap,      Icon: SwapIcon    },
    { href: `/${locale}/wallet`,  label: extra.wallet,    Icon: WalletIcon  },
  ] as const;

  return (
    <ForgeSpotlight className="balance-card-bg animate-fade-in-up p-[27px]">
      {/* top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <ForgePulse>{t("totalBalance")}</ForgePulse>

          <p className="mt-2 break-words text-[2rem] font-bold leading-tight tracking-tight text-white">
            {fmtUSD(totalValueUSD)}
          </p>

          {cuahAmount > 0 && (
            <p className="mt-1 text-[13px] font-semibold text-[#7eb8ff]">
              ₴ {fmtCUAH(cuahAmount)} cUAH
            </p>
          )}

          {cuahChangePercent !== undefined && (
            <p className={`mt-1 flex items-center gap-1 ${isUp ? "percent-pos" : "percent-neg"}`}>
              <span>{isUp ? "▲" : "▼"}</span>
              <span>{isUp ? "+" : ""}{cuahChangePercent.toFixed(2)}%</span>
            </p>
          )}

          {address ? (
            <p className="mt-2 font-mono text-[11px] text-[#344d72]">{fmtAddr(address)}</p>
          ) : (
            <button
              type="button"
              onClick={() => {
                clearError();
                void connectWallet();
              }}
              disabled={walletLoading}
              className="mt-3 inline-flex min-h-9 items-center justify-center rounded-xl
                         bg-accent-500 px-4 text-sm font-semibold text-white
                         transition hover:bg-accent-600 active:scale-[0.98]
                         disabled:cursor-not-allowed disabled:opacity-60"
            >
              {walletLoading ? "..." : t("connectWalletAction")}
            </button>
          )}

          {!address && walletError && (
            <p className="mt-2 max-w-[260px] text-[11px] leading-snug text-[#ff8b9a]">
              {walletError}
            </p>
          )}
        </div>

        {/* coin badge */}
        <div
          aria-hidden="true"
          className="glow-blue flex h-[52px] w-[52px] shrink-0 items-center justify-center
                     rounded-full bg-[radial-gradient(circle_at_35%_35%,#7a9fff,#1e3dbb)]"
        >
          <span className="text-[24px] font-bold leading-none text-white">₴</span>
        </div>
      </div>

      {/* action buttons */}
      <div className="mt-[27px] grid grid-cols-4 gap-[7px]">
        {actions.map(({ href, label, Icon }) => (
          <Link
            key={label} href={href}
            className="flex flex-col items-center justify-center gap-1.5 rounded-[13px_19px_13px_19px]
                       border border-white/[0.08] bg-white/[0.05] py-3 text-white
                       transition hover:bg-white/[0.09] active:scale-[0.96]"
          >
            <Icon />
            <span className="text-[11px] font-medium text-[#8899bb]">{label}</span>
          </Link>
        ))}
      </div>
    </ForgeSpotlight>
  );
}
