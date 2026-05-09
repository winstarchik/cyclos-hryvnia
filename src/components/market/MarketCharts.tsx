"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface MarketToken {
  symbol: string;
  name: string;
  priceUSD: number;
  change24h: number;
  color: string;
  points: number[];
}

interface MarketResponse {
  status: "ok";
  data: MarketToken[];
}

function formatPrice(value: number, locale: string): string {
  const intlLocale = locale === "ua" ? "uk-UA" : locale;
  return new Intl.NumberFormat(intlLocale, {
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 2,
    minimumFractionDigits: value < 1 ? 2 : 2,
    style: "currency",
  }).format(value);
}

function createSparklinePath(points: number[], width: number, height: number): string {
  if (points.length === 0) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 6;
  const innerHeight = height - padding * 2;

  return points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
      const y = padding + (1 - (point - min) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MarketSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="cy-card flex items-center gap-3 p-4" key={index}>
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.07]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="h-3 w-16 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
          <div className="h-12 w-28 animate-pulse rounded-xl bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function MarketCard({
  index,
  locale,
  token,
}: {
  index: number;
  locale: string;
  token: MarketToken;
}) {
  const isPositive = token.change24h >= 0;
  const path = useMemo(
    () => createSparklinePath(token.points, 112, 48),
    [token.points],
  );

  return (
    <div
      className="animate-fade-in-up cy-card grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 transition hover:bg-[#162033]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: token.color }}
      >
        {token.symbol === "cUAH" ? "₴" : token.symbol.slice(0, 3)}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">
            {token.symbol}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isPositive
                ? "bg-green-500/15 text-green-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {token.change24h.toFixed(2)}%
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-gray-500">{token.name}</p>
        <p className="mt-2 text-sm font-semibold text-white">
          {formatPrice(token.priceUSD, locale)}
        </p>
      </div>

      <svg
        aria-label={`${token.symbol} 7 day chart`}
        className="h-12 w-28 overflow-visible"
        role="img"
        viewBox="0 0 112 48"
      >
        <defs>
          <linearGradient id={`chart-${token.symbol}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={token.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={token.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L 112 48 L 0 48 Z`}
          fill={`url(#chart-${token.symbol})`}
          opacity="0.8"
        />
        <path
          d={path}
          fill="none"
          stroke={token.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    </div>
  );
}

export function MarketCharts() {
  const t = useTranslations("market");
  const locale = useLocale();
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMarket() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rpc/market", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch market charts");
      }
      const payload = (await response.json()) as MarketResponse;
      setTokens(payload.data);
    } catch (marketError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load market charts", marketError);
      }
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchMarket();
  }, []);

  return (
    <section aria-busy={loading} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{t("title")}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">{t("subtitle")}</p>
        </div>
        {loading ? (
          <LoadingSpinner className="mt-1 h-4 w-4 shrink-0" />
        ) : null}
      </div>

      {loading ? <MarketSkeleton /> : null}

      {error ? (
        <div
          className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100"
          role="alert"
        >
          <p>{error}</p>
          <Button
            className="mt-3 border-red-400/40 text-red-50 hover:bg-red-500/20"
            onClick={() => void fetchMarket()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("retry")}
          </Button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-3">
          {tokens.map((token, index) => (
            <MarketCard
              index={index}
              key={token.symbol}
              locale={locale}
              token={token}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
