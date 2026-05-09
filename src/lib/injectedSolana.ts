"use client";

import type { Transaction as SolanaTransaction } from "@solana/web3.js";

export type InjectedSolanaWalletId = "phantom" | "solflare";

export interface InjectedSolanaProvider {
  isConnected?: boolean;
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString: () => string };
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: { toString: () => string };
  }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
  ) => Promise<{ signature: string } | string>;
  signTransaction?: (
    transaction: SolanaTransaction,
  ) => Promise<SolanaTransaction>;
}

export interface InjectedSolanaWallet {
  id: InjectedSolanaWalletId;
  name: string;
  provider: InjectedSolanaProvider;
}

export const INJECTED_SOLANA_WALLET_NOT_FOUND =
  "No Solana wallet was found in this browser. Install Phantom or Solflare, or continue with Google or Email.";

declare global {
  interface Window {
    phantom?: {
      solana?: InjectedSolanaProvider;
    };
    solana?: InjectedSolanaProvider;
    solflare?: InjectedSolanaProvider;
  }
}

/**
 * Finds an installed Solana wallet provider in the current browser.
 * Web3Auth handles embedded Google/Email wallets; this helper covers existing
 * self-custodial wallets such as Phantom and Solflare when they are present.
 */
export function getInjectedSolanaWallet(): InjectedSolanaWallet | null {
  if (typeof window === "undefined") return null;

  const phantomProvider =
    window.phantom?.solana ??
    (window.solana?.isPhantom ? window.solana : undefined);

  if (phantomProvider) {
    return {
      id: "phantom",
      name: "Phantom",
      provider: phantomProvider,
    };
  }

  const solflareProvider =
    window.solflare ??
    (window.solana?.isSolflare ? window.solana : undefined);

  if (solflareProvider) {
    return {
      id: "solflare",
      name: "Solflare",
      provider: solflareProvider,
    };
  }

  return null;
}
