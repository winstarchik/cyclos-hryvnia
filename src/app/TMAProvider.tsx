"use client";

export function TMAProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Thin wrapper kept for future Telegram-specific providers. TMA launch params
  // are read directly from `window.Telegram.WebApp` to avoid unnecessary SDK code
  // in the client bundle.
  return children;
}

