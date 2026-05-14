"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface AdminWallet {
  id: string;
  email: string;
  walletPublicKey: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginDevice: string | null;
  lastLoginUserAgent: string | null;
}

interface AdminWalletsPayload {
  status: "ok";
  data: {
    count: number;
    fundedCount: number;
    wallets: AdminWallet[];
  };
}

type AdminStep = "locked" | "code" | "dashboard";

const AUTO_REFRESH_MS = 30_000;

function shortAddress(address: string | null) {
  if (!address) return "No wallet yet";
  if (address.length <= 14) return address;
  return `${address.slice(0, 7)}...${address.slice(-5)}`;
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function csvEscape(value: string | null) {
  const text = value ?? "";
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(wallets: AdminWallet[]) {
  const header = [
    "email",
    "walletPublicKey",
    "createdAt",
    "lastLoginAt",
    "lastLoginDevice",
    "lastLoginUserAgent",
  ];

  const rows = wallets.map((wallet) => [
    wallet.email,
    wallet.walletPublicKey ?? "",
    wallet.createdAt,
    wallet.lastLoginAt ?? "",
    wallet.lastLoginDevice ?? "",
    wallet.lastLoginUserAgent ?? "",
  ]);

  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function AdminDashboard() {
  const [step, setStep] = useState<AdminStep>("locked");
  const [secretInput, setSecretInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const lockAdmin = useCallback((message = "") => {
    void fetch("/api/admin/session", { method: "DELETE" });
    setStep("locked");
    setSecretInput("");
    setCodeInput("");
    setMaskedEmail("");
    setWallets([]);
    setLastUpdated(null);
    setQuery("");
    setCopied(null);
    setError(message);
  }, []);

  const fetchWallets = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/wallets", {
          cache: "no-store",
        });

        if (response.status === 403) {
          setWallets([]);
          setStep("locked");
          setError("");
          return false;
        }

        if (!response.ok) {
          throw new Error(await readError(response, "Could not load admin data."));
        }

        const payload = (await response.json()) as AdminWalletsPayload;
        setWallets(payload.data.wallets);
        setStep("dashboard");
        setLastUpdated(new Date().toISOString());
        return true;
      } catch (loadError) {
        setWallets([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load admin data.",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchWallets();
  }, [fetchWallets]);

  useEffect(() => {
    if (step !== "dashboard") return;

    const intervalId = window.setInterval(() => {
      void fetchWallets();
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchWallets, step]);

  const filteredWallets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return wallets;

    return wallets.filter((wallet) =>
      [
        wallet.email,
        wallet.walletPublicKey,
        wallet.lastLoginDevice,
        wallet.lastLoginUserAgent,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, wallets]);

  const walletCount = wallets.length;
  const createdWalletCount = wallets.filter((wallet) => wallet.walletPublicKey).length;
  const deviceCount = new Set(
    wallets
      .map((wallet) => wallet.lastLoginDevice)
      .filter((device): device is string => Boolean(device)),
  ).size;

  async function handleRequestCode() {
    const normalizedSecret = secretInput.trim();
    if (!normalizedSecret) {
      setError("Enter ADMIN_API_SECRET first.");
      return;
    }

    setRequestingCode(true);
    setError("");

    try {
      const response = await fetch("/api/admin/request-code", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${normalizedSecret}`,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        lockAdmin("Wrong admin secret. Access was locked.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          await readError(response, "Could not send the admin email code."),
        );
      }

      const payload = (await response.json()) as {
        data?: { email?: string };
      };

      setMaskedEmail(payload.data?.email ?? "admin email");
      setCodeInput("");
      setStep("code");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send the admin email code.",
      );
    } finally {
      setRequestingCode(false);
    }
  }

  async function handleVerifyCode() {
    const activeSecret = secretInput.trim();
    if (!activeSecret) {
      setStep("locked");
      setError("Enter ADMIN_API_SECRET first.");
      return;
    }

    setVerifyingCode(true);
    setError("");

    try {
      const response = await fetch("/api/admin/verify-code", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: codeInput.trim() }),
        cache: "no-store",
      });

      if (response.status === 401) {
        const message = await readError(response, "Wrong or expired admin code.");
        if (message === "Unauthorized") {
          lockAdmin("Wrong admin secret. Access was locked.");
          return;
        }

        throw new Error(message);
      }

      if (!response.ok) {
        throw new Error(await readError(response, "Could not verify admin code."));
      }

      setSecretInput("");
      setCodeInput("");
      await fetchWallets();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Could not verify admin code.",
      );
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleCopy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function handleExportCsv() {
    const csv = buildCsv(filteredWallets);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cyclos-wallets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-dvh bg-dark-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-[2rem] border border-white/[0.07] bg-[#0f1825] p-5 shadow-2xl shadow-black/25 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-400">
                Cyclos Admin
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Wallet Registry
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7a8faa]">
                Protected by admin secret and email code. Wallet data stays hidden
                until both checks pass.
              </p>
            </div>

            {step === "dashboard" && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void fetchWallets()}
                  disabled={loading}
                  className="min-h-11 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-accent-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={filteredWallets.length === 0}
                  className="min-h-11 rounded-2xl bg-accent-500 px-4 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => lockAdmin()}
                  className="min-h-11 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
                >
                  Lock
                </button>
              </div>
            )}
          </div>
        </header>

        {step !== "dashboard" && (
          <section className="rounded-[2rem] border border-white/[0.07] bg-[#0f1825] p-5 shadow-xl shadow-black/20 sm:p-6">
            {step === "locked" ? (
              <>
                <label
                  htmlFor="admin-secret"
                  className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7ab8]"
                >
                  ADMIN_API_SECRET
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="admin-secret"
                    type="password"
                    autoComplete="off"
                    value={secretInput}
                    onChange={(event) => setSecretInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleRequestCode();
                    }}
                    placeholder="Paste admin secret"
                    className="min-h-12 flex-1 rounded-2xl border border-white/[0.08] bg-dark-900 px-4 text-white outline-none transition placeholder:text-gray-600 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => void handleRequestCode()}
                    disabled={requestingCode}
                    className="min-h-12 rounded-2xl bg-accent-500 px-6 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestingCode ? "Sending code..." : "Send email code"}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#7a8faa]">
                  Wrong secrets immediately clear the admin session. Wallet data is
                  not loaded until email verification succeeds.
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7ab8]">
                  Email verification
                </p>
                <h2 className="mt-2 text-2xl font-bold">Enter admin code</h2>
                <p className="mt-2 text-sm leading-6 text-[#7a8faa]">
                  We sent a one-time code to {maskedEmail || "your admin email"}.
                  It expires in 10 minutes.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={codeInput}
                    onChange={(event) =>
                      setCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleVerifyCode();
                    }}
                    placeholder="000000"
                    className="min-h-12 flex-1 rounded-2xl border border-white/[0.08] bg-dark-900 px-4 text-center text-xl font-bold tracking-[0.35em] text-white outline-none transition placeholder:text-gray-600 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyCode()}
                    disabled={verifyingCode || codeInput.length !== 6}
                    className="min-h-12 rounded-2xl bg-accent-500 px-6 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verifyingCode ? "Checking..." : "Open admin"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => void handleRequestCode()}
                    disabled={requestingCode}
                    className="font-semibold text-accent-300 transition hover:text-accent-200 disabled:opacity-50"
                  >
                    {requestingCode ? "Sending..." : "Send a new code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => lockAdmin()}
                    className="font-semibold text-red-200 transition hover:text-red-100"
                  >
                    Clear and lock
                  </button>
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}
          </section>
        )}

        {step === "dashboard" && (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/[0.07] bg-[#0f1825] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#5d7ab8]">
                  Accounts
                </p>
                <p className="mt-2 text-3xl font-bold">{walletCount}</p>
              </div>
              <div className="rounded-3xl border border-white/[0.07] bg-[#0f1825] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#5d7ab8]">
                  Wallets
                </p>
                <p className="mt-2 text-3xl font-bold">{createdWalletCount}</p>
              </div>
              <div className="rounded-3xl border border-white/[0.07] bg-[#0f1825] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#5d7ab8]">
                  Devices
                </p>
                <p className="mt-2 text-3xl font-bold">{deviceCount}</p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/[0.07] bg-[#0f1825] p-4 shadow-xl shadow-black/20 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search email, wallet, device..."
                    className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-dark-900 px-4 text-white outline-none transition placeholder:text-gray-600 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#7a8faa]">
                  <span>Auto-refresh: {AUTO_REFRESH_MS / 1000}s</span>
                  <span className="hidden h-1 w-1 rounded-full bg-[#3d5070] sm:block" />
                  <span>Updated: {formatDate(lastUpdated)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              {copied && (
                <div className="mt-4 rounded-2xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                  Copied {copied}
                </div>
              )}

              <div className="mt-4 overflow-hidden rounded-3xl border border-white/[0.06]">
                <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_1fr_auto] gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#5d7ab8] lg:grid">
                  <span>Email</span>
                  <span>Wallet</span>
                  <span>Device</span>
                  <span>Last login</span>
                  <span>Actions</span>
                </div>

                {filteredWallets.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-[#7a8faa]">
                    {loading ? "Loading wallets..." : "No wallets found."}
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {filteredWallets.map((wallet) => (
                      <article
                        key={wallet.id}
                        className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto] lg:items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#5d7ab8] lg:hidden">
                            Email
                          </p>
                          <p className="truncate font-semibold text-white">
                            {wallet.email}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#5d7ab8] lg:hidden">
                            Wallet
                          </p>
                          <p className="truncate font-mono text-[13px] text-accent-100">
                            {shortAddress(wallet.walletPublicKey)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#5d7ab8] lg:hidden">
                            Device
                          </p>
                          <p className="truncate text-[#d8e2f5]">
                            {wallet.lastLoginDevice ?? "Unknown"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#5d7ab8] lg:hidden">
                            Last login
                          </p>
                          <p className="text-[#7a8faa]">
                            {formatDate(wallet.lastLoginAt)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => void handleCopy(wallet.email, "email")}
                            className="min-h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-white transition hover:border-accent-500/60"
                          >
                            Email
                          </button>
                          {wallet.walletPublicKey && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopy(wallet.walletPublicKey!, "wallet")
                                }
                                className="min-h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-white transition hover:border-accent-500/60"
                              >
                                Copy
                              </button>
                              <a
                                href={`https://solscan.io/account/${wallet.walletPublicKey}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center rounded-xl bg-accent-500 px-3 text-xs font-semibold text-white transition hover:bg-accent-600"
                              >
                                Solscan
                              </a>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
