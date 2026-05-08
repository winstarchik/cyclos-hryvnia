const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const withNextIntl = require("next-intl/plugin")("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: ["@solana/web3.js"],
  },
  outputFileTracingRoot: __dirname,
};

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));

