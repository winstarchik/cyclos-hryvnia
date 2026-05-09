"use client";

import type { ReactNode } from "react";
import { Web3AuthProvider } from "@web3auth/modal/react";
import { web3AuthContextConfig } from "@/lib/web3auth";

interface Web3AuthAppProviderProps {
  children: ReactNode;
}

export function Web3AuthAppProvider({ children }: Web3AuthAppProviderProps) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      {children}
    </Web3AuthProvider>
  );
}

