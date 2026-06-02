"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ForgePulse } from "@/components/common/ForgeUI";
import type { NFTCollection } from "@/types";

interface NFTCollectionsResponse {
  status: "ok";
  source: "fallback";
  updatedAt: string;
  currency: {
    solPriceUSD: number;
    cuahPriceUSD: number;
    uahPerUSD: number;
  };
  data: {
    collections: NFTCollection[];
  };
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
    notation: value >= 10_000 ? "compact" : "standard",
  }).format(value);
}

function formatSol(value: number): string {
  return `${formatCompact(value)} SOL`;
}

function formatCuah(value: number): string {
  return `${formatCompact(value)} cUAH`;
}

function CollectionArt({ collection, index }: { collection: NFTCollection; index: number }) {
  const initials = collection.symbol.slice(0, 3).toUpperCase();
  const gradients = [
    "from-[#304cff] via-[#1d2a72] to-[#060a16]",
    "from-[#00d4aa] via-[#17515a] to-[#060a16]",
    "from-[#f59e0b] via-[#63320d] to-[#060a16]",
    "from-[#a855f7] via-[#3c1a64] to-[#060a16]",
    "from-[#38bdf8] via-[#16405c] to-[#060a16]",
  ];

  if (collection.image) {
    return (
      <div
        aria-hidden="true"
        className="h-16 w-16 shrink-0 rounded-2xl border border-white/[0.08] bg-cover bg-center"
        style={{ backgroundImage: `url(${collection.image})` }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br ${gradients[index % gradients.length]}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.30),transparent_32%),linear-gradient(135deg,transparent,rgba(255,255,255,0.08))]" />
      <div className="absolute inset-x-2 bottom-2 rounded-xl bg-black/30 py-1 text-center text-[11px] font-black tracking-wide text-white">
        {initials}
      </div>
    </div>
  );
}

function CollectionCard({ collection, index }: { collection: NFTCollection; index: number }) {
  const t = useTranslations("nfts");
  const isPositive = collection.change24hPercent >= 0;

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="forge-spotlight animate-fade-in-up p-[13px]"
      initial={{ opacity: 0, y: 16 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
    >
      <div className="flex items-start gap-4">
        <CollectionArt collection={collection} index={index} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-white">{collection.name}</h2>
              <p className="mt-0.5 text-xs text-[#5e7298]">
                {collection.symbol} · {collection.marketplace === "tensor" ? "Tensor" : "Magic Eden"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                isPositive ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {collection.change24hPercent.toFixed(2)}%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-400">
                {t("floor")}
              </p>
              <p className="mt-1 text-sm font-bold text-white">{formatSol(collection.floorPriceSOL)}</p>
              <p className="mt-0.5 text-xs text-[#5e7298]">{formatCuah(collection.floorPriceUAH)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-400">
                {t("volume24h")}
              </p>
              <p className="mt-1 text-sm font-bold text-white">{formatSol(collection.volume24hSOL)}</p>
              <p className="mt-0.5 text-xs text-[#5e7298]">
                {formatCompact(collection.listedCount)} {t("listed")}
              </p>
            </div>
          </div>

          <a
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-accent-500/45 bg-accent-500/10 px-4 text-sm font-bold text-accent-300 transition hover:bg-accent-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
            href={collection.marketplaceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {t("openMarketplace")}
          </a>
        </div>
      </div>
    </motion.article>
  );
}

function NFTSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="cy-card flex gap-4 p-4" key={index}>
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-white/[0.07]" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-36 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 animate-pulse rounded-2xl bg-white/[0.05]" />
              <div className="h-16 animate-pulse rounded-2xl bg-white/[0.05]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NFTsPage() {
  const t = useTranslations("nfts");
  const common = useTranslations("common");
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"collections" | "owned">("collections");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function loadCollections() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/nfts/collections", {
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`NFT API responded with ${response.status}`);
      }

      const payload = (await response.json()) as NFTCollectionsResponse;
      setCollections(payload.data.collections);
      setUpdatedAt(payload.updatedAt);
    } catch (loadError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[nfts] Failed to load collections", loadError);
      }
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalVolume = useMemo(
    () => collections.reduce((sum, collection) => sum + collection.volume24hSOL, 0),
    [collections],
  );

  return (
    <main className="cy-page" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      <section className="mx-auto w-full max-w-[520px] px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 12 }}>
          <ForgePulse>{t("eyebrow")}</ForgePulse>
          <h1 className="mt-2 text-3xl font-bold text-white">{t("title")}</h1>
          <p className="mt-2 text-sm leading-6 text-[#6d7f9f]">{t("subtitle")}</p>
        </motion.div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="cy-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-400">
              {t("marketVolume")}
            </p>
            <p className="mt-2 text-xl font-black text-white">{formatSol(totalVolume)}</p>
          </div>
          <div className="cy-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-400">
              {t("currency")}
            </p>
            <p className="mt-2 text-xl font-black text-white">cUAH</p>
          </div>
        </div>

        <div className="mt-5 flex gap-1 rounded-2xl border border-white/[0.05] bg-[#0a1220] p-1">
          {(["collections", "owned"] as const).map((item) => (
            <button
              className={`flex-1 rounded-xl py-[10px] text-sm font-semibold transition-colors ${
                tab === item
                  ? "bg-[#152045] text-accent-400"
                  : "text-[#3a4f6e] hover:text-[#7a8faa]"
              }`}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {t(item)}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "collections" ? (
            <>
              {loading ? <NFTSkeleton /> : null}

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                  <p>{error}</p>
                  <Button className="mt-3 border-red-400/40 text-red-50 hover:bg-red-500/20" onClick={() => void loadCollections()} size="sm" type="button" variant="ghost">
                    {common("retry")}
                  </Button>
                </div>
              ) : null}

              {!loading && !error ? (
                <div className="space-y-3">
                  {updatedAt ? (
                    <p className="inline-flex items-center gap-2 text-xs text-[#3a4f6e]">
                      <span>{t("updated", { time: new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}</span>
                    </p>
                  ) : null}
                  {collections.map((collection, index) => (
                    <CollectionCard collection={collection} index={index} key={collection.id} />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="cy-card flex min-h-[42vh] flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-300">
                <LoadingSpinner className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">{t("ownedEmptyTitle")}</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#6d7f9f]">{t("ownedEmptyHint")}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
