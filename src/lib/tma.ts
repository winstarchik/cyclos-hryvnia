import { useEffect, useState } from "react";
import type { TMAUser } from "@/lib/tmaTypes";

type LaunchParamsLike = {
  initDataUnsafe?: {
    user?: {
      id?: number | string;
      username?: string;
      is_premium?: boolean;
    };
    start_param?: string;
  };
  platform?: string;
};

type TelegramWebAppLike = LaunchParamsLike & {
  initData?: string;
};

let cachedUser: TMAUser | null | undefined;
let cachedInit: Promise<TMAUser | null> | null = null;

function devLogError(error: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console
  console.error("[tma] initialization failed:", error);
}

/**
 * Returns true when running inside Telegram WebApp environment.
 */
export function isTMAEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.Telegram !== "undefined" &&
    typeof window.Telegram.WebApp !== "undefined"
  );
}

function getLaunchParams(): LaunchParamsLike {
  const webApp = window.Telegram?.WebApp as TelegramWebAppLike | undefined;

  return {
    initDataUnsafe: webApp?.initDataUnsafe,
    platform: webApp?.platform,
  };
}

/**
 * Initialize Telegram Mini App context from launch parameters.
 *
 * Returns `null` when opened outside Telegram (regular browser).
 */
export async function initializeTMA(): Promise<TMAUser | null> {
  if (cachedUser !== undefined) return cachedUser;
  if (!isTMAEnvironment()) {
    cachedUser = null;
    return null;
  }

  try {
    const params = getLaunchParams();
    const user = params.initDataUnsafe?.user;

    const userId =
      user?.id === undefined || user?.id === null ? null : String(user.id);
    if (!userId) {
      cachedUser = null;
      return null;
    }

    const tmaUser: TMAUser = {
      userId,
      username: user?.username ?? null,
      isPremium: Boolean(user?.is_premium),
      startParam: params.initDataUnsafe?.start_param ?? null,
      platform: params.platform ?? "unknown",
    };

    cachedUser = tmaUser;
    return tmaUser;
  } catch (error) {
    devLogError(error);
    cachedUser = null;
    return null;
  }
}

/**
 * React hook wrapper for Telegram Mini App context.
 *
 * - Caches the result to avoid re-initialization.
 * - Returns `null` when not running in Telegram.
 */
export function useTMA(): TMAUser | null {
  const [value, setValue] = useState<TMAUser | null>(() => cachedUser ?? null);

  useEffect(() => {
    if (cachedUser !== undefined) {
      setValue(cachedUser);
      return;
    }

    if (!cachedInit) {
      cachedInit = initializeTMA();
    }

    void cachedInit.then((result) => {
      setValue(result);
    });
  }, []);

  return value;
}

