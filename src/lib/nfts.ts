import type { NFTCollection } from "@/types";

const SOL_PRICE_USD = 180;
const CUAH_PRICE_USD = 0.025;

function toCollection(input: Omit<NFTCollection, "chain" | "floorPriceUSD" | "floorPriceUAH">): NFTCollection {
  const floorPriceUSD = input.floorPriceSOL * SOL_PRICE_USD;

  return {
    ...input,
    chain: "solana",
    floorPriceUSD,
    floorPriceUAH: floorPriceUSD / CUAH_PRICE_USD,
  };
}

export const NFT_MARKET_CURRENCY = {
  solPriceUSD: SOL_PRICE_USD,
  cuahPriceUSD: CUAH_PRICE_USD,
  uahPerUSD: 1 / CUAH_PRICE_USD,
} as const;

export const FALLBACK_NFT_COLLECTIONS: NFTCollection[] = [
  toCollection({
    id: "mad-lads",
    name: "Mad Lads",
    symbol: "MAD",
    image: null,
    marketplace: "magiceden",
    floorPriceSOL: 42.8,
    listedCount: 684,
    volume24hSOL: 1280,
    change24hPercent: 3.2,
    marketplaceUrl: "https://magiceden.io/marketplace/mad_lads",
  }),
  toCollection({
    id: "solana-monkey-business",
    name: "Solana Monkey Business",
    symbol: "SMB",
    image: null,
    marketplace: "magiceden",
    floorPriceSOL: 18.4,
    listedCount: 312,
    volume24hSOL: 420,
    change24hPercent: -1.6,
    marketplaceUrl: "https://magiceden.io/marketplace/solana_monkey_business",
  }),
  toCollection({
    id: "claynosaurz",
    name: "Claynosaurz",
    symbol: "CLAY",
    image: null,
    marketplace: "magiceden",
    floorPriceSOL: 26.9,
    listedCount: 521,
    volume24hSOL: 735,
    change24hPercent: 5.1,
    marketplaceUrl: "https://magiceden.io/marketplace/claynosaurz",
  }),
  toCollection({
    id: "tensorians",
    name: "Tensorians",
    symbol: "TNSR",
    image: null,
    marketplace: "tensor",
    floorPriceSOL: 11.7,
    listedCount: 448,
    volume24hSOL: 296,
    change24hPercent: 0.8,
    marketplaceUrl: "https://www.tensor.trade/trade/tensorians",
  }),
  toCollection({
    id: "famous-fox-federation",
    name: "Famous Fox Federation",
    symbol: "FOX",
    image: null,
    marketplace: "magiceden",
    floorPriceSOL: 6.35,
    listedCount: 902,
    volume24hSOL: 164,
    change24hPercent: -0.4,
    marketplaceUrl: "https://magiceden.io/marketplace/famous_fox_federation",
  }),
];

export async function getNFTCollections(): Promise<{
  collections: NFTCollection[];
  source: "fallback";
}> {
  // Public marketplace APIs change auth and quota rules often. We keep the
  // route stable with curated Solana collections and real outbound links, then
  // can swap this function to Magic Eden/Tensor credentials server-side.
  return {
    collections: FALLBACK_NFT_COLLECTIONS,
    source: "fallback",
  };
}
