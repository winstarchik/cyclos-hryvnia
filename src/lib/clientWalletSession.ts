"use client";

let emailWalletSecretKeyBase64: string | null = null;

export function setEmailWalletSecretKey(secretKeyBase64: string | null) {
  emailWalletSecretKeyBase64 = secretKeyBase64;
}

export function getEmailWalletSecretKey() {
  return emailWalletSecretKeyBase64;
}

export function clearEmailWalletSecretKey() {
  emailWalletSecretKeyBase64 = null;
}
