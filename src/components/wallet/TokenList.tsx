"use client";

import Image from "next/image";
import type { Balance } from "@/types";

interface TokenListProps {
  balances: Balance[];
}

/* ── Per-token gradient + optional glow class ─────────────── */
const TOKEN_STYLE: Record<string, { grad: string; glow: string }> = {
  SOL:  { grad: "linear-gradient(135deg,#9945FF,#7B2FBE)", glow: "glow-purple" },
  USDC: { grad: "linear-gradient(135deg,#2775CA,#1557A0)", glow: "glow-blue"   },
  cUAH: { grad: "linear-gradient(135deg,#3B6FFF,#1E40E0)", glow: "glow-blue"   },
  WBTC: { grad: "linear-gradient(135deg,#F7931A,#C96F00)", glow: "glow-orange" },
  BTC:  { grad: "linear-gradient(135deg,#F7931A,#C96F00)", glow: "glow-orange" },
  ETH:  { grad: "linear-gradient(135deg,#627EEA,#3C5BB5)", glow: "glow-blue"   },
  BNB:  { grad: "linear-gradient(135deg,#F3BA2F,#C49210)", glow: "glow-orange" },
};

function tokenStyle(symbol: string) {
  return TOKEN_STYLE[symbol] ?? { grad: "linear-gradient(135deg,#4169e1,#233e93)", glow: "glow-blue" };
}

/* ── Amount formatters ─────────────────────────────────────── */
function fmtAmount(n: number) {
  return n >= 1_000
    ? n.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(n);
}

function sortBalances(balances: Balance[]) {
  return [...balances].sort((a, b) => {
    if (a.token.symbol === "cUAH") return -1;
    if (b.token.symbol === "cUAH") return 1;
    return b.valueUSD - a.valueUSD;
  });
}

/* ── Token icon ────────────────────────────────────────────── */
function TokenIcon({ token }: { token: Balance["token"] }) {
  const { grad, glow } = tokenStyle(token.symbol);

  if (token.logo) {
    return (
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.04] ${glow}`}
      >
        <Image
          alt={`${token.symbol} logo`}
          className="h-full w-full rounded-full object-contain"
          height={40} width={40}
          loading="lazy"
          sizes="40px"
          src={token.logo}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={token.symbol}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                  text-[13px] font-bold text-white ${glow}`}
      style={{ background: grad }}
    >
      {token.symbol === "cUAH" ? "₴" : token.symbol.slice(0, 2)}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
export function TokenList({ balances }: TokenListProps) {
  if (balances.length === 0) return null;

  const sortedBalances = sortBalances(balances);

  return (
    <div className="flex flex-col">
      {sortedBalances.map((bal, i) => {
        /* changePercent is optional — not in base Balance type yet */
        const pct = (bal as Balance & { changePercent?: number }).changePercent;
        const hasChange = pct !== undefined && pct !== null;
        const isUp = hasChange && pct >= 0;

        return (
          <div
            key={bal.token.address}
            className="token-card animate-fade-in-left group flex min-w-0 items-center gap-[13px] border-b border-white/[0.035] bg-[linear-gradient(90deg,transparent,rgba(107,143,255,.025),transparent)]"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            {/* icon */}
            <TokenIcon token={bal.token} />

            {/* name */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-white">
                {bal.token.symbol}
              </p>
              <p className="truncate text-[12px] text-[#3d5070]">
                {bal.token.name}
              </p>
            </div>

            {/* amounts */}
            <div className="shrink-0 text-right">
              <p className="text-[14px] font-semibold text-white">
                {bal.token.symbol === "cUAH" && "₴ "}
                {fmtAmount(bal.amount)}
              </p>
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-[12px] text-[#3d5070]">{fmtUSD(bal.valueUSD)}</p>
                {hasChange && (
                  <span className={isUp ? "percent-pos" : "percent-neg"}>
                    {isUp ? "+" : ""}{pct.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
