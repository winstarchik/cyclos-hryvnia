import { beforeEach, describe, expect, it } from "vitest";
import { useWalletStore } from "@/stores/walletStore";

describe("Wallet Store", () => {
  beforeEach(async () => {
    const { disconnect } = useWalletStore.getState();
    await disconnect();
  });

  it("should initialize with correct defaults", () => {
    const state = useWalletStore.getState();

    expect(state.address).toBeNull();
    expect(state.connected).toBe(false);
    expect(state.provider).toBeNull();
  });

  it("should disconnect correctly", async () => {
    const { disconnect } = useWalletStore.getState();
    await disconnect();
    const state = useWalletStore.getState();

    expect(state.connected).toBe(false);
  });
});
