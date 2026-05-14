"use client";

interface CsrfResponse {
  status: "ok" | "error";
  data?: {
    csrfToken?: string;
  };
}

let cachedCsrfToken: string | null = null;

export function clearCachedCsrfToken() {
  cachedCsrfToken = null;
}

export async function getCsrfToken(forceRefresh = false) {
  if (cachedCsrfToken && !forceRefresh) {
    return cachedCsrfToken;
  }

  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not initialize security token.");
  }

  const payload = (await response.json()) as CsrfResponse;
  const token = payload.data?.csrfToken;

  if (!token) {
    throw new Error("Security token response was invalid.");
  }

  cachedCsrfToken = token;
  return token;
}

export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const csrfToken = await getCsrfToken(attempt > 0);
    const headers = new Headers(init.headers);
    headers.set("X-CSRF-Token", csrfToken);

    const response = await fetch(input, {
      ...init,
      credentials: init.credentials ?? "include",
      headers,
    });

    if (response.status !== 403 || attempt === 1) {
      return response;
    }

    clearCachedCsrfToken();
  }

  throw new Error("Security check failed.");
}
