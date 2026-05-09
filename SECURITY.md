# Security

## Architecture

Cyclos Hryvnia is a Telegram Mini App and wallet UI with server-side app account authentication.

The app stores email/password account records in Postgres. Passwords are never stored in plaintext; they are hashed with `scrypt` and a random salt. Browser sessions are signed and stored in an HttpOnly cookie.

The app does not store wallet private keys, seed phrases, user balances, transaction history, or Telegram profile data on the server in the MVP.

Wallet access is delegated to wallet providers:

- App email/password accounts are handled by `/api/auth/*` routes and Postgres.
- Web3Auth handles non-custodial Google embedded wallet authentication.
- External wallets such as Phantom and Solflare handle private keys inside their own wallet apps/extensions.
- The app reads public Solana addresses, balances, and transaction history from Solana RPC.

## Key Management

Use environment variables for all configurable credentials and endpoints.

Public browser-safe variables:

- `NEXT_PUBLIC_SOLANA_RPC`
- `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`
- `NEXT_PUBLIC_WEB3AUTH_NETWORK`
- `NEXT_PUBLIC_ENVIRONMENT`

Server-only variables:

- `TELEGRAM_BOT_TOKEN`
- `DATABASE_URL`
- `AUTH_SECRET`

Never prefix private keys, bot tokens, database URLs, signing secrets, or webhook secrets with `NEXT_PUBLIC_`. Next.js embeds `NEXT_PUBLIC_` values into browser bundles.

Local secrets belong in `.env.local`, which is ignored by git. Vercel secrets must be configured in Project Settings -> Environment Variables, scoped separately for Production, Preview, and Development.

## Frontend Secret Protection

- No private keys are stored in this repository.
- No Web3Auth secret keys are used in the frontend; only the public client id is expected.
- Database URLs and auth signing secrets are server-only and must never use the `NEXT_PUBLIC_` prefix.
- Wallet addresses are public identifiers and may appear in UI state.
- The wallet store keeps only ephemeral auth state in memory. The durable app login is an HttpOnly cookie.
- The app does not persist private keys, seed phrases, signed transactions, bot tokens, or database credentials in browser storage.

## Account Auth Security

- `POST /api/auth/register` creates a Postgres user only when the email is not already registered.
- `POST /api/auth/login` checks that the email exists before verifying the password.
- Password verification uses timing-safe comparison.
- Auth routes validate email/password shape before touching the database.
- Auth routes include a lightweight per-IP/per-email rate limit. Production should add a persistent limiter such as Upstash Redis or Vercel Firewall rules.
- Session cookies are HttpOnly, SameSite=Lax, path-scoped to `/`, and Secure in production.

## Wallet Security

- Web3Auth SDK is used only when the user starts Google wallet auth.
- The MVP has no wallet export/import flow.
- Send transaction execution is intentionally not implemented yet.
- Address validation happens before balance RPC calls and must also be enforced before real transaction signing in Phase 4.
- Error messages should stay user-friendly and avoid exposing provider internals or secret values.

## Telegram Mini App Security

Current MVP behavior:

- The app reads launch parameters from `window.Telegram.WebApp`.
- Telegram user id can be used as a public app identifier when needed.
- HTTPS is required in production and provided by Vercel.

Known Phase 2 hardening:

- Verify Telegram `initData` signature server-side before trusting launch data.
- Validate and allowlist launch/start parameters.
- Add rate limiting for any future API endpoints that consume Telegram data.

## API Routes

Current API surface:

- `GET /api/health`: public health endpoint for uptime monitoring.
- `POST /api/auth/register`: public account registration endpoint with validation and rate limiting.
- `POST /api/auth/login`: public account login endpoint with validation and rate limiting.
- `GET /api/auth/session`: reads the current HttpOnly app session.
- `DELETE /api/auth/session`: clears the current app session.

The health endpoint performs no RPC calls, reads no PII, and always returns a fast JSON status when the app is running.

Auth endpoints must never log request bodies because they contain passwords.

Future API endpoints should:

- Validate request methods and payloads.
- Add rate limiting where abuse is possible.
- Avoid logging request bodies that can contain PII or secrets.
- Return `401`/`403` for authenticated routes and `503` for degraded dependency checks.

## Security Headers

Global response headers are configured in `next.config.js`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `X-DNS-Prefetch-Control: off`

A strict Content Security Policy is deferred until wallet, Web3Auth, Telegram WebView, and external wallet runtime domains are fully mapped and tested.

## Dependency Audit

Run:

```bash
pnpm audit --audit-level=moderate
```

High advisories found during the audit were remediated by removing unused or replaceable dependencies:

- Removed `@solana/spl-token`; the app now defines the SPL Token Program ID locally.
- Removed Telegram SDK packages; the app now reads launch params from `window.Telegram.WebApp`.

Known tracked exception:

- `GHSA-qx2v-qp2m-jg93` in `postcss` is currently pulled by stable Next.js (`next -> postcss@8.4.31`). The project tracks this exception in `pnpm-workspace.yaml` and should remove it once stable Next.js depends on `postcss >= 8.5.10`. The app does not stringify untrusted user-provided CSS.

## Incident Response

If a key is compromised:

1. Rotate the affected key immediately in the provider dashboard.
2. Update Vercel Environment Variables for Production, Preview, and Development.
3. Redeploy the app so build-time public variables are refreshed.
4. Audit recent logs and deployments.
5. Invalidate old webhooks or callback URLs if Telegram or Web3Auth configuration changed.

If Solana RPC is degraded:

1. Switch `NEXT_PUBLIC_SOLANA_RPC` to a backup provider.
2. Redeploy if the variable is build-time embedded.
3. Add provider health checks and fallback RPC routing in Phase 2.

If Telegram bot access is compromised:

1. Revoke and rotate `TELEGRAM_BOT_TOKEN`.
2. Update webhook URL and bot settings.
3. Review bot event logs for suspicious activity.

## Deployment Security

- Vercel enforces HTTPS for production deployments.
- Secrets must be configured through Vercel Project Settings.
- Avoid printing environment values in build logs.
- Protect the `main` branch and review production changes before merging.
- Keep preview deployments scoped to non-production credentials.
