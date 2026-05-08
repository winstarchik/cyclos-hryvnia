"use client";

export function TMAProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The official React provider package referenced in the roadmap (`@telegram-apps/react`)
  // is not published on npm. `@telegram-apps/sdk-react` provides hooks and re-exports the SDK
  // without requiring a provider, so this is a thin wrapper to keep the app root consistent.
  return children;
}

