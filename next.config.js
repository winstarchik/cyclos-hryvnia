const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const withNextIntl = require("next-intl/plugin")("./src/i18n/request.ts");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.web3auth.io https://*.web3auth.io https://accounts.google.com https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://api.mainnet-beta.solana.com https://*.alchemy.com https://*.g.alchemy.com https://api.coingecko.com https://quote-api.jup.ag https://lite-api.jup.ag https://*.web3auth.io https://auth.web3auth.io https://accounts.google.com https://api.telegram.org https://*.walletconnect.com wss://*.walletconnect.com",
  "frame-src 'self' https://auth.web3auth.io https://*.web3auth.io https://accounts.google.com https://*.google.com",
  "form-action 'self' https://accounts.google.com https://auth.web3auth.io",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: ["@solana/web3.js"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
        ],
      },
    ];
  },
  webpack(config) {
    config.resolve.alias["@react-native-async-storage/async-storage"] = false;
    return config;
  },
  outputFileTracingRoot: __dirname,
};

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));
