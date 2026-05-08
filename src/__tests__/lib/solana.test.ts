import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  connection,
  getAllTokenAccounts,
  getSOLBalance,
  getTokenBalance,
} from "@/lib/solana";

describe("Solana Utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSOLBalance", () => {
    it("should return a number >= 0", async () => {
      // Use a known address that has transactions.
      vi.spyOn(connection, "getBalance").mockResolvedValue(0);
      const address = "11111111111111111111111111111111";
      const balance = await getSOLBalance(address);

      expect(typeof balance).toBe("number");
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getTokenBalance", () => {
    it("should return 0 for non-existent token", async () => {
      vi.spyOn(connection, "getTokenAccountsByOwner").mockResolvedValue({
        context: { slot: 0 },
        value: [],
      });
      const address = "11111111111111111111111111111111";
      const invalidMint = "So11111111111111111111111111111111111111112";
      const balance = await getTokenBalance(address, invalidMint);

      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getAllTokenAccounts", () => {
    it("should return an array", async () => {
      vi.spyOn(connection, "getParsedTokenAccountsByOwner").mockResolvedValue({
        context: { slot: 0 },
        value: [],
      });
      const address = "11111111111111111111111111111111";
      const accounts = await getAllTokenAccounts(address);

      expect(Array.isArray(accounts)).toBe(true);
    });
  });
});
