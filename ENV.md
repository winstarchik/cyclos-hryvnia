# Environment Variables

This project uses public browser-safe variables for wallet and RPC setup, and server-only variables for secrets.

## Required Variables

- `NEXT_PUBLIC_SOLANA_RPC`: Solana RPC endpoint. Use devnet locally and mainnet-beta in production.
- `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`: Web3Auth client id from the Embedded Wallets dashboard. This is safe to expose to the browser.
- `NEXT_PUBLIC_WEB3AUTH_NETWORK`: Web3Auth network, usually `sapphire_mainnet` or `sapphire_devnet`.
- `NEXT_PUBLIC_ENVIRONMENT`: Deployment label, for example `development`, `preview`, or `production`.

## Optional Local Diagnostics

- `ANALYZE`: Set to `true` only when running a local bundle analysis build.
- `NEXT_PUBLIC_WEB3AUTH_REDIRECT_URL`: Explicit redirect URL for Web3Auth social login. If omitted, the app uses the current browser origin. Add this exact URL to the Web3Auth dashboard whitelist.
- `NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID`: Only needed when Google login uses a custom Web3Auth auth connection/verifier.

## Server-Only Variables

- `TELEGRAM_BOT_TOKEN`: Telegram bot token. Never prefix this with `NEXT_PUBLIC_`.
- `DATABASE_URL`: Postgres connection string used by the email/password auth API.
- `AUTH_SECRET`: Long random secret used to sign the HttpOnly app session cookie.

Next.js embeds every `NEXT_PUBLIC_` variable into browser bundles. Keep private keys, bot tokens, database URLs, signing secrets, and webhook secrets server-side only.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in local development values.
3. Never commit `.env.local` or any real secret file.
4. Use separate values for development, preview, and production.

Example local values:

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=YOUR_WEB3AUTH_CLIENT_ID_HERE
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet
NEXT_PUBLIC_WEB3AUTH_REDIRECT_URL=http://localhost:3000
NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID=
TELEGRAM_BOT_TOKEN=TEST_BOT_TOKEN
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/cyclos
AUTH_SECRET=replace-with-a-long-random-local-secret
NEXT_PUBLIC_ENVIRONMENT=development
ANALYZE=false
```

## Vercel Setup

Add variables in Vercel Project Settings -> Environment Variables for each environment:

- Production
- Preview
- Development

Recommended values:

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=...
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_mainnet
NEXT_PUBLIC_WEB3AUTH_REDIRECT_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID=
NEXT_PUBLIC_ENVIRONMENT=production
TELEGRAM_BOT_TOKEN=...
DATABASE_URL=...
AUTH_SECRET=...
```

Mark server-side secrets as sensitive in Vercel, rotate keys regularly, and use different keys for development, preview, and production.

## Validation

Environment reads go through `src/lib/env.ts`.

```ts
import { SOLANA_RPC, WEB3AUTH_CLIENT_ID } from "@/lib/env";
```

Use `getTelegramBotToken()` only in server-side code.
