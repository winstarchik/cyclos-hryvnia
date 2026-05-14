# Security

## Architecture

Cyclos Hryvnia is a Telegram Mini App and non-custodial Solana wallet with server-side email/password account authentication.

Email login and registration use a one-time code sent through SMTP before password verification or password creation. Passwords are hashed with `scrypt` and random salts. OTP tokens and browser sessions are signed and stored in HttpOnly cookies.

The app stores the Cyclos email-wallet vault on the server only as encrypted client-side ciphertext. The plaintext Solana secret key is decrypted in the browser after the user enters their password, kept in module memory for the active tab, and is never persisted to Zustand, localStorage, sessionStorage, or server logs.

Wallet access is delegated to wallet providers:

- App account authentication is handled by `/api/auth/email/*`, `/api/auth/login`, `/api/auth/register`, and `/api/auth/password/*` routes.
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
- `TELEGRAM_WEBHOOK_SECRET`
- `AUTH_SECRET`
- `ADMIN_API_SECRET`
- `ADMIN_EMAIL`
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Never prefix private keys, bot tokens, database URLs, SMTP credentials, signing secrets, or webhook secrets with `NEXT_PUBLIC_`. Next.js embeds `NEXT_PUBLIC_` values into browser bundles.

Local secrets belong in `.env.local`, which is ignored by git. Vercel secrets must be configured in Project Settings -> Environment Variables, scoped separately for Production, Preview, and Development.

## Frontend Secret Protection

- No private keys are stored in this repository.
- No Web3Auth secret keys are used in the frontend; only the public client id is expected.
- Database URLs, SMTP credentials, and auth signing secrets are server-only and must never use the `NEXT_PUBLIC_` prefix.
- Wallet addresses are public identifiers and may appear in UI state.
- The wallet store keeps only ephemeral auth state in memory. The durable app login is an HttpOnly cookie.
- The app does not persist plaintext private keys, seed phrases, signed transactions, bot tokens, database URLs, or SMTP credentials in browser storage.
- The decrypted Cyclos wallet key is held outside Zustand in a module-private browser variable and is cleared on logout.
- The encrypted wallet vault can only be updated by an authenticated request that passes same-origin and CSRF-token checks.

## Account Auth Security

- `POST /api/auth/email/request-code` validates email, checks account existence for the chosen mode, and sends a one-time code.
- `POST /api/auth/register` verifies the signed OTP cookie, confirms matching passwords, hashes the password, and creates the user.
- `POST /api/auth/login` verifies the signed OTP cookie and account password.
- `POST /api/auth/password/forgot` sends a signed recovery link without revealing whether an email exists. Reset tokens are placed in the URL fragment (`#token=...`) so they are not sent in HTTP requests, Vercel route logs, or Referer headers.
- `POST /api/auth/password/reset` verifies the signed recovery link, updates the stored password hash, and invalidates old reset links.
- OTP, reset-token, password, and session checks use timing-safe comparisons where applicable.
- Auth routes validate email/code/password shape before touching external services.
- Auth routes use a durable Postgres-backed per-IP/per-email rate limit in production. Local development falls back to an in-memory limiter.
- Rate-limit IP keys prefer Vercel's trusted forwarding header. Generic `X-Forwarded-For` is ignored outside development unless `TRUST_PROXY_HEADERS=true`.
- Session cookies are HttpOnly, `__Host-` prefixed in production, path-scoped to `/`, and Secure in production. Production uses `SameSite=None` for Telegram Mini App iframe compatibility and protects mutating routes with CSRF tokens.

## CSRF Protection

- `GET /api/auth/csrf` issues a signed CSRF token and an HttpOnly `__Host-cyclos_csrf` cookie in production.
- Mutating cookie-authenticated routes require `X-CSRF-Token` and a matching CSRF cookie.
- The server also rejects cross-origin mutating requests when the `Origin` header does not match the app origin.
- This protects wallet-vault updates such as `PUT /api/auth/wallet` even while the session cookie uses `SameSite=None`.

## Wallet Security

- Web3Auth SDK is used only when the user starts Google wallet auth.
- The MVP has no wallet export/import flow.
- The Cyclos email wallet signs SOL and SPL-token transfers locally after the user unlocks the encrypted vault with their password.
- SPL transfers construct Associated Token Account and TransferChecked instructions directly with `@solana/web3.js`; `@solana/spl-token` is not shipped in the app bundle.
- Jupiter swap quote and transaction responses are checked against the requested mints, amount, route shape, and connected signer before signing.
- Address validation happens before balance RPC calls and before transaction signing.
- Error messages should stay user-friendly and avoid exposing provider internals or secret values.

## Telegram Mini App Security

- The app verifies Telegram Mini App `initData` server-side through `/api/tma/verify` using the bot token and Telegram's HMAC algorithm before trusting Telegram identity.
- `initDataUnsafe` is used only as a development fallback outside production.
- The Telegram webhook requires the `x-telegram-bot-api-secret-token` header in production.
- HTTPS is required in production and provided by Vercel.

## API Routes

Current API surface:

- `GET /api/health`: public health endpoint for uptime monitoring.
- `POST /api/auth/email/request-code`: public OTP request endpoint with validation and rate limiting.
- `POST /api/auth/register`: public registration endpoint with OTP, password validation, hashing, and rate limiting.
- `POST /api/auth/login`: public login endpoint with OTP, password validation, and rate limiting.
- `POST /api/auth/password/forgot`: public password recovery email endpoint with rate limiting.
- `POST /api/auth/password/reset`: public password reset endpoint with signed-token validation and rate limiting.
- `GET /api/auth/session`: reads the current HttpOnly app session.
- `DELETE /api/auth/session`: clears the current app session and requires CSRF.
- `GET /api/auth/wallet`: returns the authenticated user's encrypted wallet vault.
- `PUT /api/auth/wallet`: saves the authenticated user's encrypted wallet vault and requires CSRF.
- `POST /api/tma/verify`: verifies Telegram Mini App launch data.

The health endpoint performs no RPC calls, reads no PII, and always returns a fast JSON status when the app is running.

Auth endpoints must never log request bodies because they contain email addresses and one-time codes.

Future API endpoints should:

- Validate request methods and payloads.
- Add rate limiting where abuse is possible.
- Require CSRF on cookie-authenticated mutating routes.
- Avoid logging request bodies that can contain PII or secrets.
- Return `401`/`403` for authenticated routes and `503` for degraded dependency checks.

## Security Headers

Global response headers are configured in `next.config.js`:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `X-DNS-Prefetch-Control: off`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` with Telegram frame ancestors and production `unsafe-eval` disabled

`X-Frame-Options` is intentionally not used because the app must be embeddable in Telegram. Framing is restricted through CSP `frame-ancestors`.

## Dependency Audit

Run:

```bash
pnpm audit --audit-level=moderate
```

High advisories found during the audit were remediated by removing unused or replaceable dependencies:

- Removed `@solana/spl-token`; the app now defines the SPL Token Program ID locally.
- Removed Telegram SDK packages; the app now reads launch params from `window.Telegram.WebApp`.
- Removed the `bigint-buffer` vulnerability path by removing `@solana/spl-token` from runtime dependencies.

Known tracked exception:

- `GHSA-qx2v-qp2m-jg93` in `postcss` is currently pulled by stable Next.js (`next -> postcss@8.4.31`). The project tracks this exception in `pnpm-workspace.yaml` and should remove it once stable Next.js depends on `postcss >= 8.5.10`. The app does not stringify untrusted user-provided CSS.
- `GHSA-848j-6mx2-7j84` in `elliptic` is currently pulled transitively by Web3Auth/Torus packages. npm currently reports `elliptic@6.6.1` as latest, so there is no installable patched release to override to yet. Re-check after Web3Auth/Torus publishes updated dependency ranges.

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
