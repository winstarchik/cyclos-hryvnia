"use client";

import { useWalletStore, type WalletStore } from "@/stores/walletStore";

export type UseWalletResult = Pick<
  WalletStore,
  | "address"
  | "connected"
  | "provider"
  | "loading"
  | "error"
  | "connectMagic"
  | "connectPhantom"
  | "disconnect"
  | "clearError"
>;

/**
 * Thin React hook for accessing wallet state and connection actions.
 *
 * @example
 * ```tsx
 * const { address, connected, connectMagic } = useWallet();
 *
 * if (connected) {
 *   return <p>Connected to {address}</p>;
 * }
 * ```
 */
export function useWallet(): UseWalletResult {
  const address = useWalletStore((state) => state.address);
  const connected = useWalletStore((state) => state.connected);
  const provider = useWalletStore((state) => state.provider);
  const loading = useWalletStore((state) => state.loading);
  const error = useWalletStore((state) => state.error);
  const connectMagic = useWalletStore((state) => state.connectMagic);
  const connectPhantom = useWalletStore((state) => state.connectPhantom);
  const disconnect = useWalletStore((state) => state.disconnect);
  const clearError = useWalletStore((state) => state.clearError);

  return {
    address,
    connected,
    provider,
    loading,
    error,
    connectMagic,
    connectPhantom,
    disconnect,
    clearError,
  };
}

