# Cyclos Hryvnia (cUAH)

Your gateway to Solana DeFi via Telegram Mini App.

## Overview

Cyclos Hryvnia is a non-custodial crypto wallet interface for Ukrainian users, with English, Ukrainian, and Russian localization.

The app lets users:

- Sign in or register with email verification and password
- Sign in with Google through Web3Auth embedded wallet auth
- Connect external Solana wallets such as Phantom and Solflare
- View balances across Solana tokens through `NEXT_PUBLIC_SOLANA_RPC`
- Check transaction history
- Share a receive address via QR code
- Prepare a crypto send flow
- Track popular token market charts

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **State**: Zustand
- **Blockchain**: Solana Web3.js
- **Auth and wallets**: Email/password accounts, Web3Auth Google, Phantom/Solflare
- **TMA**: Telegram Mini App browser context
- **Deployment**: Vercel
- **i18n**: next-intl (EN/UA/RU)
- **Testing**: Vitest

## Auth Architecture

The primary login path is email plus password with email-code verification:

1. User clicks **Continue with Email**.
2. The app opens `/[locale]/email-login`.
3. User enters an email address.
4. `POST /api/auth/email/request-code` sends a 6-digit one-time code through SMTP and stores a signed OTP cookie.
5. User enters the code.
6. Login users enter the account password. Registration users create and repeat a new password.
7. `POST /api/auth/login` or `POST /api/auth/register` verifies the code and password, creates an HttpOnly session cookie, and redirects to the wallet.

Password recovery:

1. User opens **Forgot password?**.
2. `POST /api/auth/password/forgot` sends a signed reset link by email.
3. User enters a new password twice on `/[locale]/reset-password`.
4. `POST /api/auth/password/reset` updates the stored password hash and starts a new session.

Alternative login paths:

- Google social login uses Web3Auth embedded wallet auth.
- External wallet login uses injected Solana providers such as Phantom or Solflare.

All methods are normalized by `src/hooks/useWallet.ts` into the same app interface:

- `address`
- `email`
- `connected`
- `provider`
- `connectorName`
- `solanaWallet`
- `connection`
- `connectGoogle()`
- `connectExternalWallet()`
- `disconnect()`

## Web3Auth Checklist

Before testing Google or external wallet auth:

1. Use the same Web3Auth network as the app, for example `sapphire_mainnet`.
2. Add every app URL to the Web3Auth whitelist, including `http://localhost:3000` and the Vercel URL.
3. Enable Google login for the project.
4. Enable the Web platform in project settings.

## Features

### MVP

- Telegram Mini App-ready layout
- Email/password registration and login with email-code verification
- Web3Auth Google embedded wallet login
- External Solana wallet connection with Phantom/Solflare
- SOL + SPL token balance reads
- Transaction history from Solana RPC
- QR code receive address sharing
- Dark fintech mobile-first UI
- Multilingual interface (EN/UA/RU)
- API health check and RPC helper endpoints
- Vercel deployment configuration

### Planned

- Production send transaction execution
- Token swap integration
- Staking interface
- Advanced charts and analytics
- Push notifications
- Telegram init data verification
- Multi-chain support

## Getting Started

### Prerequisites

- Node.js 20 LTS recommended
- pnpm 8.5+
- Solana RPC endpoint
- SMTP mailbox or email provider for one-time login codes
- Postgres `DATABASE_URL` for production account storage
- Auth secret for signed HttpOnly session cookies
- Web3Auth project/client id for Google and wallet login
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

# Server-only values, never prefix with NEXT_PUBLIC_
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
AUTH_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/cyclos
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your@gmail.com
SMTP_PASS=google-app-password
SMTP_FROM="Cyclos <your@gmail.com>"

# Optional diagnostics
NEXT_PUBLIC_ENVIRONMENT=production
ANALYZE=false
```

For Gmail SMTP, use a Google app password, not the mailbox password. Local development can run without `DATABASE_URL`; it uses `.data/cyclos-users.json`, which is ignored by git. Production must use Postgres.

## Project Structure

```text
src/
  app/          Next.js App Router pages and API routes
  components/   React UI components
  hooks/        Custom React hooks
  stores/       Zustand stores
  lib/          Solana, Web3Auth, TMA, env, and server helpers
  constants/    Token and chain constants
  types/        Shared TypeScript types
  styles/       Global CSS
  i18n/         Locale messages and routing config
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

- Open `/en`, `/ua`, and `/ru`
- Click **Continue with Email** and confirm `/[locale]/email-login` opens
- Enter an invalid email and confirm a friendly validation message appears
- Configure SMTP, register with email code + repeated password, and confirm the app redirects to `/[locale]/wallet`
- Login with the same email, email code, and password
- Use **Forgot password?**, open the reset link, set a new password twice, and confirm access works
- Click **Continue with Google** and confirm Web3Auth starts the Google flow when the domain is whitelisted
- Confirm Phantom/Solflare external wallet connection works when a supported wallet is installed
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
- Email login uses signed short-lived OTP cookies, hashed passwords, and HttpOnly session cookies
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

## Known Limitations

- Production send transaction signing is still being hardened
- No DEX swaps
- No staking
- Solana-only MVP
- Basic transaction parsing
- cUAH mint address is still a launch placeholder

## Contact

- GitHub: [@winstarchik](https://github.com/winstarchik)
- Telegram: configure project contact before public launch
- Email: configure project contact before public launch
