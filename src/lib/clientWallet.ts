"use client";

import { Keypair } from "@solana/web3.js";
import { csrfFetch } from "@/lib/csrf";

export interface EncryptedCyclosWallet {
  version: 1;
  publicKey: string;
  cipherText: string;
  iv: string;
  salt: string;
  kdf: "PBKDF2-SHA256";
  iterations: number;
}

export interface UnlockedCyclosWallet {
  address: string;
  secretKeyBase64: string;
  keypair: Keypair;
}

interface WalletApiResponse {
  status: "ok" | "error";
  data?: {
    wallet?: EncryptedCyclosWallet | null;
  };
  message?: string;
}

const WALLET_KDF_ITERATIONS = 310_000;
const AES_KEY_LENGTH = 256;

function ensureBrowserCrypto() {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Secure browser crypto is required to unlock this wallet.");
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

export function base64ToBytes(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function keypairFromSecretKeyBase64(secretKeyBase64: string) {
  return Keypair.fromSecretKey(base64ToBytes(secretKeyBase64));
}

async function deriveWalletKey(
  password: string,
  salt: Uint8Array,
  iterations = WALLET_KDF_ITERATIONS,
) {
  ensureBrowserCrypto();

  const material = await window.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    material,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptWallet(
  keypair: Keypair,
  password: string,
): Promise<EncryptedCyclosWallet> {
  ensureBrowserCrypto();

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveWalletKey(password, salt);
  const secretKeyBase64 = bytesToBase64(keypair.secretKey);
  const plainText = new TextEncoder().encode(
    JSON.stringify({
      publicKey: keypair.publicKey.toBase58(),
      secretKey: secretKeyBase64,
      createdAt: new Date().toISOString(),
    }),
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plainText),
  );

  return {
    version: 1,
    publicKey: keypair.publicKey.toBase58(),
    cipherText: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    kdf: "PBKDF2-SHA256",
    iterations: WALLET_KDF_ITERATIONS,
  };
}

async function decryptWallet(
  encryptedWallet: EncryptedCyclosWallet,
  password: string,
): Promise<UnlockedCyclosWallet> {
  ensureBrowserCrypto();

  const key = await deriveWalletKey(
    password,
    base64ToBytes(encryptedWallet.salt),
    encryptedWallet.iterations,
  );
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(base64ToBytes(encryptedWallet.iv)),
    },
    key,
    toArrayBuffer(base64ToBytes(encryptedWallet.cipherText)),
  );
  const payload = JSON.parse(new TextDecoder().decode(decrypted)) as {
    publicKey?: string;
    secretKey?: string;
  };

  if (!payload.secretKey) {
    throw new Error("Wallet vault is missing a secret key.");
  }

  const keypair = keypairFromSecretKeyBase64(payload.secretKey);
  const address = keypair.publicKey.toBase58();

  if (address !== encryptedWallet.publicKey || payload.publicKey !== address) {
    throw new Error("Wallet vault public key does not match the secret key.");
  }

  return {
    address,
    secretKeyBase64: payload.secretKey,
    keypair,
  };
}

export async function fetchEncryptedCyclosWallet() {
  const response = await fetch("/api/auth/wallet", {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as WalletApiResponse;
  return payload.data?.wallet ?? null;
}

async function saveEncryptedCyclosWallet(wallet: EncryptedCyclosWallet) {
  const response = await csrfFetch("/api/auth/wallet", {
    body: JSON.stringify({ wallet }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as WalletApiResponse;
    throw new Error(payload.message ?? "Could not save wallet vault.");
  }
}

export async function unlockOrCreateCyclosWallet(
  _email: string,
  password: string,
): Promise<UnlockedCyclosWallet> {
  const existingWallet = await fetchEncryptedCyclosWallet();

  if (existingWallet) {
    return decryptWallet(existingWallet, password);
  }

  const keypair = Keypair.generate();
  const encryptedWallet = await encryptWallet(keypair, password);
  await saveEncryptedCyclosWallet(encryptedWallet);

  return {
    address: keypair.publicKey.toBase58(),
    secretKeyBase64: bytesToBase64(keypair.secretKey),
    keypair,
  };
}
