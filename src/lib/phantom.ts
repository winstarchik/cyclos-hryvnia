/**
 * Phantom wallet integration (web fallback).
 *
 * - Phantom is fully custodial: the user holds and controls their private keys.
 * - Requires the Phantom browser extension.
 * - Works on desktop web (browser) only.
 * - Use as a fallback for users who prefer a browser extension over Magic Link.
 *
 * SSR-safe: no access to `window` unless it exists.
 */

export interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (tx: any) => Promise<{ signature: string }>;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

let cachedAddress: string | null = null;

/**
 * Returns true if Phantom is installed in the current browser.
 */
export function isPhantomInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.solana?.isPhantom);
}

/**
 * Connect to Phantom wallet.
 *
 * If Phantom is not installed, opens Phantom download page.
 *
 * @throws when user rejects connection or Phantom is unavailable
 */
export async function connectPhantom(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Phantom can only be used in the browser.");
  }

  if (!isPhantomInstalled()) {
    window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
    throw new Error("Phantom is not installed. Please install the extension.");
  }

  try {
    const result = await window.solana!.connect();
    const address = result.publicKey.toString();
    cachedAddress = address;
    return address;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/reject|denied|declined/i.test(message)) {
      throw new Error("Phantom connection was rejected by the user.");
    }
    throw new Error("Failed to connect to Phantom.");
  }
}

/**
 * Get the currently connected Phantom address (no reconnection attempt).
 */
export async function getPhantomWallet(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isPhantomInstalled()) return null;

  if (cachedAddress) return cachedAddress;

  const key = window.solana?.publicKey;
  if (!key) return null;

  const address = key.toString();
  cachedAddress = address;
  return address;
}

/**
 * Sign and send a transaction via Phantom.
 *
 * @returns Transaction signature / hash
 */
export async function phantomSignAndSend(tx: any): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Phantom can only be used in the browser.");
  }
  if (!isPhantomInstalled()) {
    throw new Error("Phantom is not installed.");
  }

  try {
    const { signature } = await window.solana!.signAndSendTransaction(tx);
    if (!signature) {
      throw new Error("Phantom did not return a transaction signature.");
    }
    return signature;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/reject|denied|declined/i.test(message)) {
      throw new Error("Transaction signing was rejected by the user.");
    }
    throw new Error("Failed to sign and send transaction with Phantom.");
  }
}

/**
 * Disconnect Phantom and clear cached state.
 */
export async function disconnectPhantom(): Promise<void> {
  cachedAddress = null;

  if (typeof window === "undefined") return;
  if (!window.solana) return;

  try {
    await window.solana.disconnect();
  } catch {
    // ignore
  }
}

