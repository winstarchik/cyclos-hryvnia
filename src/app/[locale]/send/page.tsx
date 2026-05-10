"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction as SolanaTransaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { TOKENS } from "@/constants/tokens";
import type { Balance, Token } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TxStatus = "idle" | "signing" | "sending" | "confirmed" | "error";
type SendMode = "send" | "swap";

interface FormState {
  tokenAddress: string; // "SOL" or mint address
  recipient: string;
  amount: string;
}

interface JupiterSwapInfo {
  label?: string;
  ammKey: string;
}

interface JupiterRoutePlanItem {
  percent: number;
  swapInfo: JupiterSwapInfo;
}

interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan?: JupiterRoutePlanItem[];
}

interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

function getRpc(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC ??
    "https://api.mainnet-beta.solana.com"
  );
}

const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";
const JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_URL = "https://api.jup.ag/swap/v1/swap";

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidAddress(addr: string): boolean {
  try {
    const pk = new PublicKey(addr);
    return PublicKey.isOnCurve(pk.toBytes());
  } catch {
    return false;
  }
}

function parseAmount(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toSwapMint(tokenAddress: string): string {
  return tokenAddress === "SOL" ? SOL_MINT_ADDRESS : tokenAddress;
}

function toBaseUnits(value: string, decimals: number): string | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const paddedFraction = fractionPart.padEnd(decimals, "0").slice(0, decimals);
  const whole = BigInt(wholePart || "0");
  const fraction = BigInt(paddedFraction || "0");

  return (whole * BigInt(10) ** BigInt(decimals) + fraction).toString();
}

function fromBaseUnits(value: string, decimals: number): number {
  const raw = BigInt(value || "0");
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  return Number(whole) + Number(fraction) / Number(base);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getTokenGradient(symbol: string): string {
  if (symbol === "cUAH") return "linear-gradient(135deg,#3B6FFF,#1E40E0)";
  if (symbol === "SOL") return "linear-gradient(135deg,#9945FF,#7B2FBE)";
  if (symbol.includes("BTC")) return "linear-gradient(135deg,#F7931A,#C96F00)";
  if (symbol === "USDT") return "linear-gradient(135deg,#26A17B,#168963)";
  return "linear-gradient(135deg,#2775CA,#1557A0)";
}

function getTokenGlyph(symbol: string): string {
  if (symbol === "cUAH") return "₴";
  return symbol.slice(0, 2);
}

function TokenAvatar({ token }: { token: Token }) {
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-bold text-white"
      style={{ background: getTokenGradient(token.symbol) }}
    >
      {token.logo ? (
        <Image
          src={token.logo}
          alt=""
          width={36}
          height={36}
          className="h-full w-full object-cover"
        />
      ) : (
        getTokenGlyph(token.symbol)
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M5 12l7-7M5 12l7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#22d38c" strokeWidth="1.8" />
      <path
        d="M8 12l3 3 5-5"
        stroke="#22d38c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="#ff5c75"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="28 56"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Token selector ───────────────────────────────────────────────────────────

interface TokenOptionProps {
  bal: Balance & { changePercent?: number };
  selected: boolean;
  onSelect: () => void;
}

function TokenOption({ bal, selected, onSelect }: TokenOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors
        ${selected
          ? "border border-accent-500/60 bg-accent-500/10"
          : "border border-transparent hover:bg-white/[0.04]"
        }`}
    >
      <TokenAvatar token={bal.token} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-white">{bal.token.symbol}</p>
        <p className="text-[12px] text-[#3d5070]">{bal.token.name}</p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-white">
          {bal.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}
        </p>
        <p className="text-[11px] text-[#3d5070]">
          ${bal.valueUSD.toFixed(2)}
        </p>
      </div>
      {selected && (
        <div className="ml-1 h-2 w-2 shrink-0 rounded-full bg-accent-400" />
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SendPage() {
  const locale   = useLocale();
  const t        = useTranslations("send");
  const common   = useTranslations("common");

  const { address, sendTransaction } = useWallet();
  const { balances, loading: balLoading } = useBalance();

  const [form, setForm] = useState<FormState>({
    tokenAddress: "SOL",
    recipient: "",
    amount: "",
  });
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txSig, setTxSig] = useState<string>("");
  const [errMsg, setErrMsg] = useState<string>("");
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [showSwapOutputPicker, setShowSwapOutputPicker] = useState(false);
  const [mode, setMode] = useState<SendMode>("send");
  const [swapOutputAddress, setSwapOutputAddress] = useState<string>(
    TOKENS.USDC.address,
  );
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedBal = useMemo(
    () => balances.find((b) => b.token.address === form.tokenAddress),
    [balances, form.tokenAddress],
  );

  const swapOutputOptions = useMemo<Token[]>(() => Object.values(TOKENS), []);
  const selectedOutputToken = useMemo(
    () =>
      swapOutputOptions.find((token) => token.address === swapOutputAddress) ??
      TOKENS.USDC,
    [swapOutputAddress, swapOutputOptions],
  );

  const parsedAmount = parseAmount(form.amount);
  const maxAmount = selectedBal?.amount ?? 0;
  const swapOutAmount = quote
    ? fromBaseUnits(quote.outAmount, selectedOutputToken.decimals)
    : 0;
  const swapRate =
    parsedAmount > 0 && swapOutAmount > 0 ? swapOutAmount / parsedAmount : 0;

  const recipientValid = form.recipient === "" || isValidAddress(form.recipient);
  const amountValid =
    form.amount === "" ||
    (parsedAmount > 0 && parsedAmount <= maxAmount);

  const canSend =
    isValidAddress(form.recipient) &&
    parsedAmount > 0 &&
    parsedAmount <= maxAmount &&
    !!address &&
    status === "idle";

  const canSwap =
    !!selectedBal &&
    !!address &&
    parsedAmount > 0 &&
    parsedAmount <= maxAmount &&
    !!quote &&
    !quoteLoading &&
    toSwapMint(selectedBal.token.address) !== toSwapMint(swapOutputAddress) &&
    status === "idle";

  const canSubmit = mode === "send" ? canSend : canSwap;

  useEffect(() => {
    if (!selectedBal) return;

    const inputMint = toSwapMint(selectedBal.token.address);
    const fallbackOutput =
      swapOutputOptions.find(
        (token) => toSwapMint(token.address) !== inputMint,
      ) ?? TOKENS.USDC;

    if (toSwapMint(swapOutputAddress) === inputMint) {
      setSwapOutputAddress(fallbackOutput.address);
    }
  }, [selectedBal, swapOutputAddress, swapOutputOptions]);

  useEffect(() => {
    if (mode !== "swap") {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    if (!selectedBal || !form.amount || parsedAmount <= 0) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    if (parsedAmount > maxAmount) {
      setQuote(null);
      setQuoteError("Insufficient balance for this swap.");
      setQuoteLoading(false);
      return;
    }

    const rawAmount = toBaseUnits(form.amount, selectedBal.token.decimals);
    if (!rawAmount || BigInt(rawAmount) <= BigInt(0)) {
      setQuote(null);
      setQuoteError("Enter a valid amount.");
      setQuoteLoading(false);
      return;
    }

    const inputMint = toSwapMint(selectedBal.token.address);
    const outputMint = toSwapMint(swapOutputAddress);
    if (inputMint === outputMint) {
      setQuote(null);
      setQuoteError("Choose a different output token.");
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);

      try {
        const params = new URLSearchParams({
          inputMint,
          outputMint,
          amount: rawAmount,
          slippageBps: "50",
          restrictIntermediateTokens: "true",
        });

        const response = await fetch(`${JUPITER_QUOTE_URL}?${params}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Jupiter route was not found for this pair.");
        }

        const payload = (await response.json()) as JupiterQuoteResponse;
        if (!payload.outAmount) {
          throw new Error("Jupiter returned an empty quote.");
        }

        setQuote(payload);
      } catch (quoteError) {
        if (controller.signal.aborted) return;
        const message =
          quoteError instanceof Error
            ? quoteError.message
            : "Could not load swap quote.";
        setQuote(null);
        setQuoteError(message);
      } finally {
        if (!controller.signal.aborted) {
          setQuoteLoading(false);
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    form.amount,
    maxAmount,
    mode,
    parsedAmount,
    selectedBal,
    swapOutputAddress,
  ]);

  // ── Build + send transaction ───────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!canSend || !address) return;

    setStatus("signing");
    setErrMsg("");

    try {
      const connection = new Connection(getRpc(), "confirmed");
      const fromPubkey = new PublicKey(address);
      const toPubkey   = new PublicKey(form.recipient);
      const tx         = new SolanaTransaction();

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer        = fromPubkey;

      if (form.tokenAddress === "SOL") {
        // ── Native SOL transfer ──────────────────────────────────────────
        const lamports = Math.round(parsedAmount * LAMPORTS_PER_SOL);
        tx.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          }),
        );
      } else {
        // ── SPL token transfer ───────────────────────────────────────────
        const mintPubkey = new PublicKey(form.tokenAddress);
        const decimals   = selectedBal?.token.decimals ?? 6;

        const sourceAta = await getAssociatedTokenAddress(
          mintPubkey,
          fromPubkey,
        );
        const destAta = await getAssociatedTokenAddress(
          mintPubkey,
          toPubkey,
        );

        // Create destination ATA if it doesn't exist yet
        try {
          await getAccount(connection, destAta, "confirmed");
        } catch (e: unknown) {
          if (
            e instanceof TokenAccountNotFoundError ||
            e instanceof TokenInvalidAccountOwnerError
          ) {
            tx.add(
              createAssociatedTokenAccountInstruction(
                fromPubkey, // payer
                destAta,
                toPubkey,
                mintPubkey,
              ),
            );
          } else {
            throw e;
          }
        }

        const rawAmount = BigInt(
          Math.round(parsedAmount * 10 ** decimals),
        );

        tx.add(
          createTransferCheckedInstruction(
            sourceAta,
            mintPubkey,
            destAta,
            fromPubkey,
            rawAmount,
            decimals,
          ),
        );
      }

      setStatus("sending");

      const signature = await sendTransaction(tx, connection);

      // Confirm
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );

      setTxSig(signature);
      setStatus("confirmed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrMsg(msg);
      setStatus("error");
    }
  }, [
    canSend,
    address,
    form.recipient,
    form.tokenAddress,
    parsedAmount,
    selectedBal?.token.decimals,
    sendTransaction,
  ]);

  const handleSwap = useCallback(async () => {
    if (!canSwap || !address || !quote) return;

    setStatus("signing");
    setErrMsg("");

    try {
      const connection = new Connection(getRpc(), "confirmed");

      const response = await fetch(JUPITER_SWAP_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: address,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: 1_000_000,
              priorityLevel: "medium",
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Jupiter could not build the swap transaction.");
      }

      const payload = (await response.json()) as JupiterSwapResponse;
      const transaction = VersionedTransaction.deserialize(
        base64ToBytes(payload.swapTransaction),
      );

      setStatus("sending");
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setTxSig(signature);
      setStatus("confirmed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Swap failed";
      setErrMsg(msg);
      setStatus("error");
    }
  }, [address, canSwap, quote, sendTransaction]);

  const handlePrimaryAction = useCallback(async () => {
    if (mode === "swap") {
      await handleSwap();
      return;
    }

    await handleSend();
  }, [handleSend, handleSwap, mode]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxSig("");
    setErrMsg("");
    setQuote(null);
    setQuoteError(null);
    setForm({ tokenAddress: "SOL", recipient: "", amount: "" });
  }, []);

  // ── Confirmed screen ───────────────────────────────────────────────────────

  if (status === "confirmed") {
    return (
      <main className="cy-page" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
        <div className="cy-shell flex min-h-screen flex-col items-center justify-center gap-6 py-12">
          <div className="animate-scale-in flex flex-col items-center gap-4 text-center">
            <CheckCircleIcon />
            <div>
              <p className="text-[20px] font-bold text-white">
                {mode === "swap" ? "Swap confirmed" : (t("successTitle") ?? "Sent!")}
              </p>
              <p className="mt-1 text-[14px] text-[#3d5070]">
                {parsedAmount} {selectedBal?.token.symbol ?? "SOL"}{" "}
                {t("successTo") ?? "sent to"}{" "}
                <span className="font-mono text-[#6b8fff]">
                  {form.recipient.slice(0, 6)}…{form.recipient.slice(-4)}
                </span>
              </p>
            </div>

            <a
              href={`https://solscan.io/tx/${txSig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-accent-500/40
                         bg-accent-500/10 px-5 py-2.5 text-[13px] font-semibold text-accent-400
                         transition hover:bg-accent-500/20"
            >
              {t("viewOnSolscan") ?? "View on Solscan"}
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6m0 0v6m0-6L10 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>

            <button
              type="button"
              onClick={reset}
              className="mt-2 text-[13px] text-[#3d5070] underline-offset-2 hover:text-[#7a8faa] hover:underline"
            >
              {t("sendAnother") ?? "Send another"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  const isBusy = status === "signing" || status === "sending";

  return (
    <main
      className="cy-page"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-[480px]">

        {/* ── Header ── */}
        <header
          className="bg-gradient-to-b from-[#080f20] to-dark-950 px-4 pb-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          <div className="mb-5 flex items-center gap-3">
            <Link
              href={`/${locale}/wallet`}
              aria-label={common("back") ?? "Back"}
              className="flex h-9 w-9 items-center justify-center rounded-xl
                         border border-white/[0.07] bg-white/[0.04] text-[#7a8faa]
                         transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeftIcon />
            </Link>
            <h1 className="text-[18px] font-bold text-white">
              {t("title") ?? "Send"}
            </h1>
          </div>
        </header>

        <div className="space-y-4 px-4 pt-1">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1">
            {(["send", "swap"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setStatus("idle");
                  setErrMsg("");
                  setShowTokenPicker(false);
                  setShowSwapOutputPicker(false);
                }}
                className={`min-h-[44px] rounded-xl text-[13px] font-semibold transition ${
                  mode === item
                    ? "bg-accent-500 text-white shadow-[0_0_24px_rgba(59,111,255,0.25)]"
                    : "text-[#7a8faa] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {item === "send" ? "Send" : "Swap"}
              </button>
            ))}
          </div>

          {/* ── Token selector ── */}
          <div className="cy-card rounded-[1.4rem] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#5d7ab8]">
              {t("selectToken") ?? "Select Token"}
            </p>

            {balLoading && balances.length === 0 ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-[58px] animate-pulse rounded-2xl bg-white/[0.05]"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Show selected token + expand */}
                {selectedBal && !showTokenPicker && (
                  <button
                    type="button"
                    onClick={() => setShowTokenPicker(true)}
                    className="flex w-full items-center gap-3 rounded-2xl border
                               border-accent-500/40 bg-accent-500/10 px-3 py-3 transition
                               hover:bg-accent-500/15"
                  >
                    <TokenAvatar token={selectedBal.token} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[14px] font-semibold text-white">
                        {selectedBal.token.symbol}
                      </p>
                      <p className="text-[12px] text-[#3d5070]">
                        {selectedBal.amount.toLocaleString("en-US", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        available
                      </p>
                    </div>
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      className="shrink-0 text-[#3d5070]"
                      aria-hidden
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}

                {/* Token list (expanded or no selection) */}
                {(showTokenPicker || !selectedBal) &&
                  balances.map((bal) => (
                    <TokenOption
                      key={bal.token.address}
                      bal={bal}
                      selected={bal.token.address === form.tokenAddress}
                      onSelect={() => {
                        setForm((f) => ({
                          ...f,
                          tokenAddress: bal.token.address,
                          amount: "",
                        }));
                        setShowTokenPicker(false);
                      }}
                    />
                  ))}

                {!balLoading && balances.length === 0 && (
                  <p className="py-4 text-center text-[13px] text-[#3d5070]">
                    No tokens available
                  </p>
                )}
              </div>
            )}
          </div>

          {mode === "swap" && (
            <div className="cy-card rounded-[1.4rem] p-4">
              <p className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-[#5d7ab8]">
                Receive Token
              </p>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSwapOutputPicker((current) => !current)}
                  disabled={isBusy}
                  aria-expanded={showSwapOutputPicker}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-accent-500/45
                             bg-dark-950/60 px-3 py-3 text-left transition hover:border-accent-400/70
                             hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <TokenAvatar token={selectedOutputToken} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-white">
                      {selectedOutputToken.symbol}
                    </p>
                    <p className="truncate text-[12px] text-[#3d5070]">
                      {selectedOutputToken.name}
                    </p>
                  </div>
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`shrink-0 text-[#7a8faa] transition-transform ${
                      showSwapOutputPicker ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {showSwapOutputPicker && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07101f] shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
                    {swapOutputOptions
                      .filter(
                        (token) =>
                          !selectedBal ||
                          toSwapMint(token.address) !==
                            toSwapMint(selectedBal.token.address),
                      )
                      .map((token) => (
                        <button
                          key={token.address}
                          type="button"
                          onClick={() => {
                            setSwapOutputAddress(token.address);
                            setShowSwapOutputPicker(false);
                            setQuote(null);
                            setQuoteError(null);
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                            token.address === swapOutputAddress
                              ? "bg-accent-500/15 text-white"
                              : "text-[#d8e2f5] hover:bg-white/[0.05]"
                          }`}
                        >
                          <TokenAvatar token={token} />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                            {token.symbol} - {token.name}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-2xl border border-white/[0.07] bg-dark-950/40 p-3">
                {quoteLoading ? (
                  <p className="flex items-center gap-2 text-[13px] text-[#7a8faa]">
                    <LoaderIcon />
                    Loading Jupiter route...
                  </p>
                ) : quote ? (
                  <div className="space-y-2 text-[13px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#3d5070]">You receive</span>
                      <span className="font-semibold text-white">
                        {swapOutAmount.toLocaleString("en-US", {
                          maximumFractionDigits: 6,
                        })}{" "}
                        {selectedOutputToken.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#3d5070]">Rate</span>
                      <span className="text-[#7a8faa]">
                        1 {selectedBal?.token.symbol ?? ""} ={" "}
                        {swapRate.toLocaleString("en-US", {
                          maximumFractionDigits: 6,
                        })}{" "}
                        {selectedOutputToken.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#3d5070]">Slippage</span>
                      <span className="text-[#7a8faa]">0.5%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#3d5070]">Route</span>
                      <span className="truncate text-right text-[#7a8faa]">
                        {quote.routePlan
                          ?.map((item) => item.swapInfo.label ?? "Jupiter")
                          .filter(Boolean)
                          .join(" + ") || "Jupiter"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#3d5070]">
                    Enter an amount to load the best Jupiter route.
                  </p>
                )}
              </div>

              {quoteError && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#ff5c75]">
                  <AlertIcon />
                  {quoteError}
                </p>
              )}
            </div>
          )}

          {/* ── Recipient address ── */}
          {mode === "send" && (
          <div className="cy-card rounded-[1.4rem] p-4">
            <label
              htmlFor="recipient"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-[#5d7ab8]"
            >
              {t("recipient") ?? "Recipient Address"}
            </label>
            <input
              id="recipient"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Enter Solana address"
              value={form.recipient}
              onChange={(e) =>
                setForm((f) => ({ ...f, recipient: e.target.value.trim() }))
              }
              disabled={isBusy}
              className={`cy-input font-mono text-[13px] ${
                !recipientValid ? "border-red-500/60 focus:border-red-500" : ""
              }`}
            />
            {!recipientValid && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#ff5c75]">
                <AlertIcon />
                {t("invalidAddress") ?? "Invalid Solana address"}
              </p>
            )}
          </div>
          )}

          {/* ── Amount ── */}
          <div className="cy-card rounded-[1.4rem] p-4">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="amount"
                className="text-[11px] font-semibold uppercase tracking-widest text-[#5d7ab8]"
              >
                {t("amount") ?? "Amount"}
              </label>
              {maxAmount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      amount: maxAmount.toString(),
                    }))
                  }
                  disabled={isBusy}
                  className="cy-chip h-7 min-h-0 px-3 text-[11px]"
                >
                  MAX
                </button>
              )}
            </div>

            <div className="relative">
              <input
                id="amount"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                disabled={isBusy}
                className={`cy-input pr-16 text-[18px] font-semibold ${
                  !amountValid ? "border-red-500/60 focus:border-red-500" : ""
                }`}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2
                               text-[13px] font-semibold text-[#3d5070]">
                {selectedBal?.token.symbol ?? "SOL"}
              </span>
            </div>

            {/* USD estimate */}
            {parsedAmount > 0 && selectedBal && (
              <p className="mt-1.5 text-[12px] text-[#3d5070]">
                ≈ $
                {(
                  (parsedAmount / maxAmount) *
                  selectedBal.valueUSD
                ).toFixed(2)}{" "}
                USD
              </p>
            )}

            {!amountValid && form.amount !== "" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#ff5c75]">
                <AlertIcon />
                {parsedAmount <= 0
                  ? (t("amountPositive") ?? "Amount must be positive")
                  : (t("insufficientBalance") ?? "Insufficient balance")}
              </p>
            )}
          </div>

          {/* ── Error banner ── */}
          {status === "error" && errMsg && (
            <div
              role="alert"
              className="animate-fade-in flex items-start gap-3 rounded-2xl border
                         border-red-500/30 bg-red-500/10 px-4 py-3"
            >
              <AlertIcon />
              <p className="text-[13px] text-red-100">{errMsg}</p>
            </div>
          )}

          {/* ── Submit button ── */}
          <button
            type="button"
            onClick={() => void handlePrimaryAction()}
            disabled={!canSubmit || isBusy}
            className="btn-primary flex min-h-[52px] w-full items-center justify-center
                       gap-2.5 rounded-2xl text-[15px] font-semibold transition
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? (
              <>
                <LoaderIcon />
                <span>
                  {status === "signing"
                    ? (t("signing") ?? "Waiting for signature…")
                    : (t("sending") ?? "Sending…")}
                </span>
              </>
            ) : (
              <>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M7 17 17 7M17 7H8M17 7v9"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {mode === "swap" ? "Swap" : (t("sendButton") ?? "Send")}
              </>
            )}
          </button>

          {/* ── Network notice ── */}
          <p className="pb-4 text-center text-[11px] text-[#2e4268]">
            {t("networkNotice") ??
              "Transactions are irreversible. Double-check the recipient address."}
          </p>
        </div>
      </div>
    </main>
  );
}
