import {
  AUTH_CONNECTION,
  CHAIN_NAMESPACES,
  UX_MODE,
  WEB3AUTH_NETWORK,
  WALLET_CONNECTORS,
  authConnector,
  type LoginMethodConfig,
  type Web3AuthOptions,
} from "@web3auth/modal";
import type { Web3AuthContextConfig } from "@web3auth/modal/react";
import {
  SOLANA_RPC,
  WEB3AUTH_AUTH_CONNECTION_ID,
  WEB3AUTH_CLIENT_ID,
  WEB3AUTH_NETWORK as WEB3AUTH_NETWORK_ENV,
} from "@/lib/env";

const WEB3AUTH_LOCAL_CLIENT_ID = "cyclos-local-web3auth-client-id";
const DEFAULT_REDIRECT_URL = "http://localhost:3000";

function getWeb3AuthNetwork() {
  if (WEB3AUTH_NETWORK_ENV === WEB3AUTH_NETWORK.SAPPHIRE_DEVNET) {
    return WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
  }

  return WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
}

function getSolanaChainConfig() {
  const isDevnet = WEB3AUTH_NETWORK_ENV === WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;

  return {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: isDevnet ? "0x3" : "0x1",
    rpcTarget: SOLANA_RPC,
    displayName: isDevnet ? "Solana Devnet" : "Solana Mainnet",
    blockExplorerUrl: isDevnet
      ? "https://explorer.solana.com/?cluster=devnet"
      : "https://explorer.solana.com",
    ticker: "SOL",
    tickerName: "Solana",
    decimals: 9,
    logo: "https://cryptologos.cc/logos/solana-sol-logo.svg",
    isTestnet: isDevnet,
  };
}

function getRedirectUrl() {
  if (process.env.NEXT_PUBLIC_WEB3AUTH_REDIRECT_URL) {
    return process.env.NEXT_PUBLIC_WEB3AUTH_REDIRECT_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return DEFAULT_REDIRECT_URL;
}

const socialLoginMethods: LoginMethodConfig = {
  [AUTH_CONNECTION.GOOGLE]: {
    name: "Google",
    description: "Continue with Google",
    mainOption: true,
    showOnModal: true,
    authConnection: AUTH_CONNECTION.GOOGLE,
    ...(WEB3AUTH_AUTH_CONNECTION_ID
      ? { authConnectionId: WEB3AUTH_AUTH_CONNECTION_ID }
      : {}),
  },
};

const web3AuthOptions: Web3AuthOptions = {
  clientId: WEB3AUTH_CLIENT_ID || WEB3AUTH_LOCAL_CLIENT_ID,
  web3AuthNetwork: getWeb3AuthNetwork(),
  chains: [getSolanaChainConfig()],
  defaultChainId: getSolanaChainConfig().chainId,
  connectors: [
    authConnector({
      connectorSettings: {
        redirectUrl: getRedirectUrl(),
        uxMode: UX_MODE.REDIRECT,
      },
    }),
  ],
  storageType: "local",
  enableLogging: process.env.NODE_ENV === "development",
  uiConfig: {
    appName: "Cyclos Hryvnia",
    mode: "dark",
    uxMode: UX_MODE.REDIRECT,
    loginMethodsOrder: [AUTH_CONNECTION.GOOGLE],
  },
  modalConfig: {
    // Web3Auth Modal v10 discovers supported external wallets from the browser
    // and WalletConnect. Keep discovery visible so Phantom/Solflare appear next
    // to the configured social login.
    hideWalletDiscovery: false,
    connectors: {
      [WALLET_CONNECTORS.AUTH]: {
        label: "Social login",
        showOnModal: true,
        loginMethods: socialLoginMethods,
      },
    },
  },
};

export const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions,
};
