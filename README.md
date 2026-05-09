# Cyclos Hryvnia

Telegram Mini App MVP for a Solana wallet experience with Magic Link and Phantom connection flows, balances, receive QR, send form stub, and transaction history.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000/en](http://localhost:3000/en).

## Core Scripts

```bash
pnpm build
pnpm test
pnpm test:coverage
```

## Environment

Copy `.env.example` to `.env.local` and fill in local values. Production secrets should be configured in Vercel project settings.

Required variables:

- `NEXT_PUBLIC_SOLANA_RPC`
- `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_ENVIRONMENT`

## MVP Scope

- Wallet onboarding with Magic Link and Phantom.
- Solana balance and SPL token account reads.
- Token list, balance card, transaction history, receive QR, and send form UI.
- English, Ukrainian, and Russian locales.
- Mobile-first navigation with safe-area support.

## Known Limitations

- No send execution in v1. Transaction signing is planned for Phase 4.
- No staking, swaps, or advanced charts.
- No KYC/AML workflow.
- cUAH mint address is a placeholder until mainnet launch.
- Telegram init data verification and rate limiting are documented for later hardening.
