import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  connection,
  getAllTokenAccounts,
  getSOLBalance,
  getTokenBalance,
  getTransactionHistory,
} from "@/lib/solana";

const RPC_TEST_TIMEOUT = 30_000;
const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111";
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";
const USDC_MINT_ADDRESS = "EPjFWaJPg5ph9BUZkixEStzS7wTkEnKwKcbz6akcVohm";

function createUnfundedAddress(): string {
  return Keypair.generate().publicKey.toBase58();
}

async function withSilencedConsoleError<T>(
  callback: () => Promise<T>,
): Promise<T> {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    return await callback();
  } finally {
    consoleError.mockRestore();
  }
}

function createMockTransaction(
  signature: string,
  blockTime: number,
  fee: number,
  err: unknown = null,
): NonNullable<Awaited<ReturnType<typeof connection.getTransaction>>> {
  return {
    blockTime,
    meta: {
      err,
      fee,
    },
    transaction: {
      signatures: [signature],
    },
  } as unknown as NonNullable<
    Awaited<ReturnType<typeof connection.getTransaction>>
  >;
}

describe("Solana Utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSOLBalance", () => {
    it(
      "should return a number >= 0",
      async () => {
        const balance = await getSOLBalance(SYSTEM_PROGRAM_ADDRESS);

        expect(typeof balance).toBe("number");
        expect(balance).toBeGreaterThanOrEqual(0);
      },
      RPC_TEST_TIMEOUT,
    );

    it("should handle invalid addresses gracefully", async () => {
      const balance = await withSilencedConsoleError(() =>
        getSOLBalance("not-a-solana-address"),
      );

      expect(balance).toBe(0);
    });

    it(
      "should return 0 for an unfunded valid address",
      async () => {
        const balance = await getSOLBalance(createUnfundedAddress());

        expect(balance).toBe(0);
      },
      RPC_TEST_TIMEOUT,
    );

    it(
      "should work with a valid public key",
      async () => {
        const publicKey = new PublicKey(SYSTEM_PROGRAM_ADDRESS);
        const balance = await getSOLBalance(publicKey.toBase58());

        expect(Number.isFinite(balance)).toBe(true);
        expect(balance).toBeGreaterThanOrEqual(0);
      },
      RPC_TEST_TIMEOUT,
    );
  });

  describe("getTokenBalance", () => {
    it(
      "should return a number >= 0",
      async () => {
        const balance = await getTokenBalance(
          SYSTEM_PROGRAM_ADDRESS,
          SOL_MINT_ADDRESS,
        );

        expect(typeof balance).toBe("number");
        expect(balance).toBeGreaterThanOrEqual(0);
      },
      RPC_TEST_TIMEOUT,
    );

    it(
      "should handle non-existent tokens",
      async () => {
        const unknownMint = createUnfundedAddress();
        const balance = await getTokenBalance(SYSTEM_PROGRAM_ADDRESS, unknownMint);

        expect(balance).toBe(0);
      },
      RPC_TEST_TIMEOUT,
    );

    it(
      "should return 0 for an account without the token",
      async () => {
        const balance = await getTokenBalance(
          createUnfundedAddress(),
          USDC_MINT_ADDRESS,
        );

        expect(balance).toBe(0);
      },
      RPC_TEST_TIMEOUT,
    );

    it(
      "should work with a valid token mint",
      async () => {
        const balance = await getTokenBalance(
          SYSTEM_PROGRAM_ADDRESS,
          USDC_MINT_ADDRESS,
        );

        expect(Number.isFinite(balance)).toBe(true);
        expect(balance).toBeGreaterThanOrEqual(0);
      },
      RPC_TEST_TIMEOUT,
    );
  });

  describe("getAllTokenAccounts", () => {
    it(
      "should return an array",
      async () => {
        const accounts = await getAllTokenAccounts(SYSTEM_PROGRAM_ADDRESS);

        expect(Array.isArray(accounts)).toBe(true);
      },
      RPC_TEST_TIMEOUT,
    );

    it(
      "should return an empty array for a wallet with no tokens",
      async () => {
        const accounts = await getAllTokenAccounts(createUnfundedAddress());

        expect(accounts).toEqual([]);
      },
      RPC_TEST_TIMEOUT,
    );

    it("should return objects with pubkey, mint, and balance", async () => {
      const tokenAccountPubkey = new PublicKey(createUnfundedAddress());
      vi.spyOn(connection, "getParsedTokenAccountsByOwner").mockResolvedValue({
        context: { slot: 1 },
        value: [
          {
            pubkey: tokenAccountPubkey,
            account: {
              data: {
                program: "spl-token",
                parsed: {
                  info: {
                    mint: USDC_MINT_ADDRESS,
                    tokenAmount: {
                      uiAmount: 12.5,
                      uiAmountString: "12.5",
                    },
                  },
                  type: "account",
                },
              },
            },
          },
        ],
      } as Awaited<ReturnType<typeof connection.getParsedTokenAccountsByOwner>>);

      const accounts = await getAllTokenAccounts(SYSTEM_PROGRAM_ADDRESS);

      expect(accounts).toEqual([
        {
          pubkey: tokenAccountPubkey.toBase58(),
          mint: USDC_MINT_ADDRESS,
          balance: 12.5,
        },
      ]);
    });

    it("should handle errors gracefully", async () => {
      vi.spyOn(connection, "getParsedTokenAccountsByOwner").mockRejectedValue(
        new Error("RPC unavailable"),
      );

      const accounts = await withSilencedConsoleError(() =>
        getAllTokenAccounts(SYSTEM_PROGRAM_ADDRESS),
      );

      expect(accounts).toEqual([]);
    });
  });

  describe("getTransactionHistory", () => {
    it(
      "should return an array",
      async () => {
        const transactions = await getTransactionHistory(createUnfundedAddress(), 10);

        expect(Array.isArray(transactions)).toBe(true);
      },
      RPC_TEST_TIMEOUT,
    );

    it("should use the default limit of 50", async () => {
      const getSignatures = vi
        .spyOn(connection, "getSignaturesForAddress")
        .mockResolvedValue([]);

      await getTransactionHistory(SYSTEM_PROGRAM_ADDRESS);

      expect(getSignatures).toHaveBeenCalledWith(expect.any(PublicKey), {
        limit: 50,
      });
    });

    it("should respect a custom limit", async () => {
      const getSignatures = vi
        .spyOn(connection, "getSignaturesForAddress")
        .mockResolvedValue([]);

      await getTransactionHistory(SYSTEM_PROGRAM_ADDRESS, 10);

      expect(getSignatures).toHaveBeenCalledWith(expect.any(PublicKey), {
        limit: 10,
      });
    });

    it("should return transaction objects sorted by timestamp descending", async () => {
      const olderSignature = "older-signature";
      const newerSignature = "newer-signature";
      const olderTx = createMockTransaction(
        olderSignature,
        1_700_000_000,
        5_000,
      );
      const newerTx = createMockTransaction(
        newerSignature,
        1_700_000_100,
        10_000,
      );

      vi.spyOn(connection, "getSignaturesForAddress").mockResolvedValue([
        { signature: olderSignature },
        { signature: newerSignature },
      ] as Awaited<ReturnType<typeof connection.getSignaturesForAddress>>);
      vi.spyOn(connection, "getTransaction").mockImplementation(
        async (signature) =>
          signature === newerSignature ? newerTx : olderTx,
      );

      const transactions = await getTransactionHistory(SYSTEM_PROGRAM_ADDRESS, 2);

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({
        id: newerSignature,
        hash: newerSignature,
        from: SYSTEM_PROGRAM_ADDRESS,
        to: SYSTEM_PROGRAM_ADDRESS,
        amount: 10_000 / LAMPORTS_PER_SOL,
        type: "send",
        status: "success",
        token: expect.objectContaining({ symbol: "SOL" }),
      });
      expect(transactions[0].timestamp).toBeGreaterThan(
        transactions[1].timestamp,
      );
      expect(transactions[0].valueUSD).toBeGreaterThan(0);
    });

    it("should mark failed transactions as failed", async () => {
      const failedSignature = "failed-signature";
      vi.spyOn(connection, "getSignaturesForAddress").mockResolvedValue([
        { signature: failedSignature },
      ] as Awaited<ReturnType<typeof connection.getSignaturesForAddress>>);
      vi.spyOn(connection, "getTransaction").mockResolvedValue(
        createMockTransaction(failedSignature, 1_700_000_000, 5_000, {
          InstructionError: [0, "Custom"],
        }),
      );

      const transactions = await getTransactionHistory(SYSTEM_PROGRAM_ADDRESS, 1);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe("failed");
    });

    it("should handle errors gracefully", async () => {
      vi.spyOn(connection, "getSignaturesForAddress").mockRejectedValue(
        new Error("RPC unavailable"),
      );

      const transactions = await withSilencedConsoleError(() =>
        getTransactionHistory(SYSTEM_PROGRAM_ADDRESS, 10),
      );

      expect(transactions).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should not throw for invalid wallet addresses", async () => {
      await withSilencedConsoleError(async () => {
        await expect(getSOLBalance("invalid-address")).resolves.toBe(0);
        await expect(getAllTokenAccounts("invalid-address")).resolves.toEqual([]);
        await expect(getTransactionHistory("invalid-address")).resolves.toEqual([]);
      });
    });

    it("should not throw for invalid token mints", async () => {
      const balance = await withSilencedConsoleError(() =>
        getTokenBalance(SYSTEM_PROGRAM_ADDRESS, "invalid-token-mint"),
      );

      expect(balance).toBe(0);
    });

    it("should return safe defaults on network errors", async () => {
      vi.spyOn(connection, "getBalance").mockRejectedValue(
        new Error("Network error"),
      );

      const balance = await withSilencedConsoleError(() =>
        getSOLBalance(SYSTEM_PROGRAM_ADDRESS),
      );

      expect(balance).toBe(0);
    });
  });
});
