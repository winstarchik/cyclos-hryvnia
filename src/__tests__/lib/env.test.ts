import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppOrigin } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("environment security helpers", () => {
  it("uses configured APP_ORIGIN for absolute security links", () => {
    vi.stubEnv("APP_ORIGIN", "https://wallet.example");

    expect(getAppOrigin("http://localhost:3000")).toBe("https://wallet.example");
  });

  it("rejects path-bearing APP_ORIGIN values", () => {
    vi.stubEnv("APP_ORIGIN", "https://wallet.example/reset");

    expect(() => getAppOrigin("http://localhost:3000")).toThrow(
      "APP_ORIGIN must be an origin",
    );
  });

  it("requires APP_ORIGIN in production", () => {
    vi.stubEnv("APP_ORIGIN", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getAppOrigin("http://poisoned.example")).toThrow(
      "Missing environment variable: APP_ORIGIN",
    );
  });
});
