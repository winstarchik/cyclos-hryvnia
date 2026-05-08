# Environment Variables

This project uses public browser-safe variables for wallet and RPC setup, and server-only variables for secrets.

## Required Variables

- `NEXT_PUBLIC_SOLANA_RPC`: Solana RPC endpoint. Use devnet locally and mainnet-beta in production.
- `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY`: Magic Link publishable key. This is safe to expose to the browser.
- `NEXT_PUBLIC_ENVIRONMENT`: Deployment label, for example `development`, `preview`, or `production`.

## Server-Only Variables

- `TELEGRAM_BOT_TOKEN`: Telegram bot token. Never prefix this with `NEXT_PUBLIC_`.

Next.js embeds every `NEXT_PUBLIC_` variable into browser bundles. Keep private keys, bot tokens, database URLs, signing secrets, and webhook secrets server-side only.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in local development values.
3. Never commit `.env.local` or any real secret file.
4. Use separate values for development, preview, and production.

Example local values:

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=pk_test_LOCAL_KEY
TELEGRAM_BOT_TOKEN=TEST_BOT_TOKEN
NEXT_PUBLIC_ENVIRONMENT=development
```

## Vercel Setup

Add variables in Vercel Project Settings -> Environment Variables for each environment:

- Production
- Preview
- Development

Recommended values:

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_ENVIRONMENT=production
TELEGRAM_BOT_TOKEN=...
```

Mark server-side secrets as sensitive in Vercel, rotate keys regularly, and use different keys for development, preview, and production.

## Validation

Environment reads go through `src/lib/env.ts`.

```ts
import { MAGIC_KEY, SOLANA_RPC } from "@/lib/env";
```

Use `getTelegramBotToken()` only in server-side code.
