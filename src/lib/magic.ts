/**
 * Magic Link for Solana.
 *
 * - Magic Link is non-custodial: user keys are generated client-side and are not
 *   shared with your servers.
 * - User email is the recovery mechanism (account access is recovered via email).
 * - Private keys never leave the user's device in plaintext.
 *
 * IMPORTANT: This module performs **no API calls on import**.
 * Everything is lazy-initialized via `initMagic()`.
 */

import type { Magic as MagicInstance } from "magic-sdk";
import { getMagicPublishableKey, SOLANA_RPC } from "@/lib/env";

type SolanaChainId = 101 | 103;

type MagicSingleton = {
  magic: MagicInstance | null;
  initPromise: Promise<MagicInstance> | null;
};

const singleton: MagicSingleton = {
  magic: null,
  initPromise: null,
};

function resolveChainId(): SolanaChainId {
  // Solana chain ids used by Magic:
  // - 101: mainnet-beta
  // - 103: devnet
  return process.env.NODE_ENV === "development" ? 103 : 101;
}

/**
 * Initialize (or return) the singleton Magic instance.
 *
 * - Uses `@magic-ext/solana` extension
 * - Network is Mainnet-Beta (101) by default, Devnet (103) in development
 * - RPC URL comes from `NEXT_PUBLIC_SOLANA_RPC`
 *
 * @throws if required env vars are missing
 */
export async function initMagic(): Promise<MagicInstance> {
  if (singleton.magic) return singleton.magic;
  if (singleton.initPromise) return singleton.initPromise;

  singleton.initPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error("Magic can only be initialized in the browser.");
    }

    const chainId = resolveChainId();
    const magicKey = getMagicPublishableKey();

    const [{ Magic }, { SolanaExtension }] = await Promise.all([
      import("magic-sdk"),
      import("@magic-ext/solana"),
    ]);

    const magic = new Magic(magicKey, {
      network: {
        rpcUrl: SOLANA_RPC,
        chainId,
      },
      extensions: [new SolanaExtension({ rpcUrl: SOLANA_RPC })],
    }) as unknown as MagicInstance;

    singleton.magic = magic;
    return magic;
  })();

  return singleton.initPromise;
}

/**
 * Login with Magic Link using email.
 *
 * @returns Magic user object
 * @throws meaningful error if login fails
 */
export async function loginWithMagic(email: string): Promise<any> {
  if (!email.trim()) {
    throw new Error("Email is required to login with Magic Link.");
  }

  try {
    const magic = await initMagic();
    await magic.auth.loginWithMagicLink({ email });
    return await magic.user.getInfo();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Magic login error.";
    throw new Error(`Magic login failed: ${message}`);
  }
}

/**
 * Get the connected Solana wallet address from Magic.
 *
 * Uses `solana_requestAccounts` under the hood.
 *
 * @throws if not authenticated or address cannot be retrieved
 */
export async function getMagicWallet(): Promise<string> {
  const magic = await initMagic();

  const isLoggedIn = await magic.user.isLoggedIn();
  if (!isLoggedIn) {
    throw new Error("Magic wallet is not authenticated. Please login first.");
  }

  const result = (await magic.rpcProvider.request({
    method: "solana_requestAccounts",
  })) as unknown;

  if (!Array.isArray(result) || typeof result[0] !== "string") {
    throw new Error("Failed to retrieve Magic Solana account address.");
  }

  return result[0];
}

/**
 * Get SOL balance for the currently authenticated Magic wallet.
 *
 * Returns balance in SOL as a number.
 */
export async function getMagicBalance(): Promise<number> {
  try {
    const magic = await initMagic();
    const address = await getMagicWallet();

    // We avoid importing @solana/web3.js here to keep this helper lightweight.
    // The RPC call returns lamports; convert to SOL.
    const lamports = (await magic.rpcProvider.request({
      method: "getBalance",
      params: [address],
    })) as unknown;

    const value =
      typeof lamports === "number"
        ? lamports
        : typeof (lamports as { value?: unknown } | null)?.value === "number"
          ? (lamports as { value: number }).value
          : null;

    if (value === null) return 0;
    return value / 1_000_000_000;
  } catch {
    return 0;
  }
}

/**
 * Sign and send a Solana transaction using Magic.
 *
 * @param tx A Solana transaction (SDK-specific shape)
 * @returns Transaction signature / hash
 */
export async function magicSignAndSend(tx: any): Promise<string> {
  try {
    const magic = await initMagic();
    const isLoggedIn = await magic.user.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error("Magic wallet is not authenticated. Please login first.");
    }

    const signature = (await magic.rpcProvider.request({
      method: "solana_signAndSendTransaction",
      params: [tx],
    })) as unknown;

    if (typeof signature !== "string" || signature.length === 0) {
      throw new Error("Magic did not return a transaction signature.");
    }

    return signature;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Magic transaction error.";
    throw new Error(`Magic sign+send failed: ${message}`);
  }
}

/**
 * Logout from Magic and clear singleton state.
 */
export async function logout(): Promise<void> {
  try {
    const magic = await initMagic();
    await magic.user.logout();
  } finally {
    singleton.magic = null;
    singleton.initPromise = null;
  }
}

