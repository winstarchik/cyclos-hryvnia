export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    return new AppError(
      error.message,
      "UNKNOWN",
      "An error occurred. Please try again.",
    );
  }

  return new AppError(
    "Unknown error",
    "UNKNOWN",
    "An unexpected error occurred. Please try again.",
  );
}

export function logDevError(context: string, error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(context, error);
  }
}

export function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|rate.?limit|too many requests/i.test(message);
}

export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /network|fetch|failed to fetch|timeout|timed out|econnreset|etimedout/i.test(
    message,
  );
}

export function shouldRetry(error: unknown): boolean {
  return isRateLimitError(error) || isNetworkError(error);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new AppError(
          `${context} timed out after ${timeoutMs}ms`,
          "TIMEOUT",
          "The network is taking longer than expected. Please try again.",
        ),
      );
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  context?: string;
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  {
    attempts = 3,
    baseDelayMs = 300,
    timeoutMs = 10_000,
    context = "operation",
  }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withTimeout(operation(), timeoutMs, context);
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      logDevError(`[retry] ${context} failed, retrying in ${delayMs}ms`, error);
      await sleep(delayMs);
    }
  }

  throw handleError(lastError);
}
