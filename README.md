# Cyclos Hryvnia (cUAH)

Your gateway to Solana DeFi via Telegram Mini App.

## Overview

Cyclos Hryvnia is a non-custodial crypto wallet interface for Ukrainian users, with English, Ukrainian, and Russian localization.

Accessible as a Telegram Mini App, it allows users to:

- Sign in or register with app email/password accounts stored in Postgres
- Sign in with Google through Web3Auth embedded wallet auth
- Connect external Solana wallets such as Phantom and Solflare
- View balances across Solana tokens through `NEXT_PUBLIC_SOLANA_RPC`
- Check transaction history
- Share a receive address via QR code
- Prepare a crypto send flow (v1 UI only)
- Track popular token market charts

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **State**: Zustand
- **Blockchain**: Solana Web3.js
- **Auth and wallets**: Postgres email/password auth, Web3Auth Google, Phantom/Solflare
- **TMA**: Telegram Mini App browser context
- **Deployment**: Vercel
- **i18n**: next-intl (EN/UA/RU)
- **Testing**: Vitest

## Wallet Auth Architecture

Cyclos uses a simple auth screen: **Log in / Register** for app accounts, **Continue with Google** for Web3Auth embedded wallet auth, and **Continue with wallet** for external Solana wallets.

Email/password auth is handled by server API routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `DELETE /api/auth/session`

User records are stored in Postgres in the `cyclos_users` table. Passwords are hashed with `scrypt` and a random salt. Browser sessions use an HttpOnly signed cookie.

Google login still uses `useWeb3AuthConnect().connectTo(WALLET_CONNECTORS.AUTH, ...)`. External wallet login uses the injected Solana provider when Phantom or Solflare is installed. Web3Auth is configured in `src/lib/web3auth.ts` with:

- Google social login through the Web3Auth auth connector
- Solana Mainnet or Devnet chain config using `NEXT_PUBLIC_SOLANA_RPC`
- Redirect UX mode for social login, which avoids browser and Telegram WebView popup blocking

All auth and wallet methods are normalized by `src/hooks/useWallet.ts` into the same app interface:

- `address`
- `connected`
- `provider`
- `connectorName`
- `solanaWallet`
- `connection`
- `connectWallet()`
- `connectSocial()`
- `connectExternalWallet()`
- `disconnect()`

Email/password auth unlocks the app session. Google and external wallet auth also provide a Solana address for balance, receive, and transaction features.

## Web3Auth Dashboard Checklist

Before testing auth, configure the Web3Auth dashboard:

1. Use the same network as the app: `sapphire_mainnet` for production/mainnet, or `sapphire_devnet` for devnet.
2. Add every app URL to the whitelist, for example `http://localhost:3000` and the Vercel deployment URL.
3. Enable Google login for the project.
4. Enable the Web platform in project settings.

## Features

### MVP (v1.0)

- Telegram Mini App-ready layout
- Email/password registration and login backed by Postgres
- Web3Auth Google embedded wallet login
- External Solana wallet connection with Phantom/Solflare when installed
- SOL + SPL token balance reads
- Transaction history from Solana RPC
- QR code receive address sharing
- Dark fintech mobile-first UI
- Multilingual interface (EN/UA/RU)
- API health check and RPC helper endpoints
- Vercel deployment configuration

### Planned (v1.1+)

- Send transaction execution
- Token swap integration
- Staking interface
- Advanced charts and analytics
- Push notifications
- Telegram init data verification
- Optional KYC/AML integrations
- Multi-chain support

## Getting Started

### Prerequisites

- Node.js 20 LTS recommended
- pnpm 8.5+
- Web3Auth project/client id
- Postgres database URL for app email/password accounts
- Auth secret for signed HttpOnly session cookies
- Solana RPC endpoint
- Telegram bot for TMA launch

### Installation

```bash
git clone https://github.com/winstarchik/cyclos-hryvnia.git
cd cyclos-hryvnia

pnpm install
cp .env.example .env.local

pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` for local development. Do not commit real values.

```bash
# Required public browser-safe values
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=YOUR_WEB3AUTH_CLIENT_ID
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_mainnet

# Optional: explicit redirect URL for Web3Auth social login
NEXT_PUBLIC_WEB3AUTH_REDIRECT_URL=http://localhost:3000

# Optional: only if Google uses a custom auth connection in Web3Auth
NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID=

# Server-only value, never prefix with NEXT_PUBLIC_
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/cyclos
AUTH_SECRET=replace-with-a-long-random-secret

# Optional diagnostics
NEXT_PUBLIC_ENVIRONMENT=production
ANALYZE=false
```

For local Web3Auth testing, add `http://localhost:3000` to the Web3Auth dashboard domain whitelist. In production, add the exact Vercel/custom-domain URL used by `NEXT_PUBLIC_WEB3AUTH_REDIRECT_URL`.

## Project Structure

```text
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # Health, balance, prices, market, transaction endpoints
│   └── [locale]/     # Locale-based app pages
├── components/       # React UI components
├── hooks/            # Custom React hooks
├── stores/           # Zustand stores
├── lib/              # Solana, Web3Auth, TMA, env, and utility helpers
├── constants/        # Token and chain constants
├── types/            # Shared TypeScript types
├── styles/           # Global CSS
└── i18n/             # Locale messages and routing config
```

## Running Locally

```bash
pnpm dev              # Start development server
pnpm test             # Run unit tests
pnpm test:ui          # Run Vitest UI
pnpm test:coverage    # Generate coverage report
pnpm build            # Build for production
pnpm start            # Start production server after build
```

Bundle analysis:

```bash
ANALYZE=true pnpm build
```

## Deployment

Vercel is recommended.

```bash
git push origin main
```

Then import the repository in Vercel, set environment variables, and deploy.

After Vercel creates a deployment URL, add it to:

- Web3Auth dashboard domain whitelist
- Telegram BotFather Web App URL/menu button

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment guide.

## Testing

```bash
pnpm test
pnpm test --watch
pnpm test:coverage
```

Recommended manual checks:

- Register a new email/password account and confirm `/api/auth/register` returns a session
- Try registering the same email again and confirm the UI returns to the login tab
- Try logging in with an unknown email and confirm the UI asks the user to register first
- Click **Continue with Google** and confirm Web3Auth starts the Google redirect flow
- Confirm Phantom/Solflare external wallet connection works when a supported wallet is installed
- Open `/en`, `/ua`, and `/ru`
- Confirm protected pages redirect when disconnected
- Verify `/api/health`
- Test mobile widths: 375px, 768px, 1200px

## Performance

- Production build is optimized by Next.js
- Inter font uses `display: swap`
- Images use `next/image`
- Tailwind CSS is purged in production
- Bundle analyzer is configured through `ANALYZE=true`

See [PERFORMANCE.md](./PERFORMANCE.md) for current notes.

## Security

- No private keys are stored in the frontend
- Email/password auth uses Postgres, scrypt password hashing, and HttpOnly signed cookies
- Web3Auth handles embedded wallet creation for Google login
- External wallets keep key management inside their own wallet apps/extensions
- Server-only secrets must not use the `NEXT_PUBLIC_` prefix
- `.env.local` is ignored by git
- HTTPS is required for production Telegram Mini App usage
- Security headers are configured in `next.config.js`

See [SECURITY.md](./SECURITY.md) for detailed security information.

## Browser Support

- Chrome/Edge latest
- Safari and iOS Safari 15+
- Firefox latest
- Chrome Mobile
- Telegram in-app browser

## Known Limitations (v1.0)

- Send transaction signing is not implemented yet
- No DEX swaps
- No staking
- No advanced portfolio analytics
- Solana-only MVP
- Basic transaction parsing
- cUAH mint address is still a launch placeholder

## Roadmap

### v1.1

- Send transaction execution
- Recipient address validation improvements
- Swap integration research
- Telegram init data verification

### v1.2

- Staking interface
- Price alerts
- Portfolio analytics
- More robust RPC caching

### v2.0

- Mobile app exploration
- Multi-chain support
- Advanced compliance options
- Production monitoring and alerting

## Contributing

```bash
git checkout -b feature/name
git add .
git commit -m "feat: describe change"
git push origin feature/name
```

Open a pull request with a clear summary, screenshots for UI changes, and test notes.

## License

MIT License. See `LICENSE` if present in the repository.

## Contact

- GitHub: [@winstarchik](https://github.com/winstarchik)
- Telegram: configure project contact before public launch
- Email: configure project contact before public launch

## Acknowledgments

- Solana Foundation
- Telegram
- Web3Auth
- Phantom Wallet
- Solflare
