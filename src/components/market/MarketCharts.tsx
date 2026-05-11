"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface MarketToken {
  symbol: string;
  name: string;
  logo: string;
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

function createSparklineGeometry(
  points: number[],
  width: number,
  height: number,
): { lastX: number; lastY: number; path: string } {
  if (points.length === 0) {
    return { lastX: 0, lastY: height / 2, path: "" };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 10;
  const innerHeight = height - padding * 2;
  let lastX = 0;
  let lastY = height / 2;

  const path = points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
      const y = padding + (1 - (point - min) / range) * innerHeight;
      lastX = x;
      lastY = y;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return { lastX, lastY, path };
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
  const chart = useMemo(
    () => createSparklineGeometry(token.points, 128, 56),
    [token.points],
  );
  const chartColor = isPositive ? "#38d8a1" : "#ef6f79";

  return (
    <div
      className="animate-fade-in-up cy-card grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 transition hover:bg-[#142030]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/[0.04] text-xs font-bold text-white"
        style={{ backgroundColor: token.color }}
      >
        <Image
          alt={`${token.symbol} logo`}
          className="h-full w-full rounded-full object-contain"
          height={40}
          loading="lazy"
          sizes="40px"
          src={token.logo}
          width={40}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
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
        className="h-14 w-32 overflow-visible rounded-xl border border-white/[0.05] bg-[#0a101b]"
        role="img"
        viewBox="0 0 128 56"
      >
        <defs>
          <clipPath id={`chart-clip-${token.symbol}`}>
            <rect height="56" rx="10" width="128" x="0" y="0" />
          </clipPath>
        </defs>
        <g clipPath={`url(#chart-clip-${token.symbol})`}>
          <path d="M0 18.5H128" stroke="white" strokeOpacity="0.045" />
          <path d="M0 37.5H128" stroke="white" strokeOpacity="0.045" />
          <path d="M42.5 0V56" stroke="white" strokeOpacity="0.035" />
          <path d="M85.5 0V56" stroke="white" strokeOpacity="0.035" />
          <path
            d={chart.path}
            fill="none"
            stroke={chartColor}
            strokeLinejoin="miter"
            strokeLinecap="butt"
            strokeWidth="1.65"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={chart.lastX}
            cy={chart.lastY}
            fill="#0a101b"
            r="2.35"
            stroke={chartColor}
            strokeWidth="1.4"
          />
        </g>
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

      {loading ? (
        <div className="scrollbar-dark max-h-[min(56vh,520px)] overflow-y-auto overscroll-contain pr-1 pb-4">
          <MarketSkeleton />
        </div>
      ) : null}

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
        <div className="scrollbar-dark max-h-[min(56vh,520px)] overflow-y-auto overscroll-contain pr-1 pb-4">
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
        </div>
      ) : null}
    </section>
  );
}
