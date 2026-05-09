# Deployment Guide

This guide covers Vercel deployment, Telegram Mini App setup, custom server deployment, and operational checks for Cyclos Hryvnia.

## Vercel (Recommended)

### Step 1: Prepare Repository

```bash
git status
git add .
git commit -m "docs: add deployment documentation"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com).
2. Click **Import Project**.
3. Select the GitHub repository.
4. Framework preset: **Next.js** (auto-detected).
5. Root directory: `./`.
6. Install command: `pnpm install --frozen-lockfile`.
7. Build command: `pnpm build`.

### Step 3: Set Environment Variables

In Vercel Dashboard -> Project Settings -> Environment Variables, add these for Production, Preview, and Development.

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=YOUR_WEB3AUTH_CLIENT_ID
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_mainnet
NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID=
NEXT_PUBLIC_ENVIRONMENT=production
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
```

Notes:

- `NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID` is optional and only needed for a custom Web3Auth Google auth connection.
- `TELEGRAM_BOT_TOKEN` is server-only. Never expose it with the `NEXT_PUBLIC_` prefix.
- Use separate Web3Auth/Solana/TMA values for development, preview, and production where possible.

### Step 4: Deploy

Click **Deploy** in Vercel. Vercel will install dependencies, run `pnpm build`, and generate a deployment URL.

After deployment, verify:

```bash
curl https://your-vercel-domain.vercel.app/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-09T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### Step 5: Configure Web3Auth Domains

In the Web3Auth dashboard:

1. Open the Cyclos Hryvnia project.
2. Go to **Domains**.
3. Add the Vercel domain:

```text
https://your-vercel-domain.vercel.app
```

4. Keep `http://localhost:3000` for local testing.
5. Confirm the Web3Auth network matches the app env:

```bash
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_mainnet
```

### Step 6: Configure Telegram Mini App

In BotFather:

```text
/setmenubutton
```

Then:

1. Select your bot.
2. Choose **Web App**.
3. Enter the Vercel URL:

```text
https://your-vercel-domain.vercel.app
```

Optional BotFather setup:

```text
/setdomain
/setdescription
/setabouttext
/setuserpic
```

### Step 7: Test Production

Open the deployed URL in a browser and in Telegram.

Check:

- `/en`, `/ua`, `/ru` load correctly
- Web3Auth Modal opens from the Connect Wallet button
- Google and Email login methods are visible
- Phantom/Solflare are visible when External Wallets are enabled in Web3Auth dashboard
- Protected pages redirect before login
- Wallet page opens after successful login
- Receive QR renders
- History and balance screens show loading/empty states gracefully
- `/api/health` returns 200
- Mobile layout has no horizontal scroll

## Custom Server

Use Vercel unless a custom infrastructure requirement exists.

### Prerequisites

- Node.js 20 LTS
- pnpm 8.5+
- HTTPS certificate
- Reverse proxy such as nginx or Apache
- Process manager such as PM2

### Deployment Steps

```bash
pnpm install
pnpm build
pnpm start
```

For a server:

```bash
ssh user@server
mkdir -p /app/cyclos-hryvnia
cd /app/cyclos-hryvnia

git clone https://github.com/winstarchik/cyclos-hryvnia.git .
pnpm install --frozen-lockfile
```

Create `.env.production`:

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=YOUR_WEB3AUTH_CLIENT_ID
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_mainnet
NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID=
NEXT_PUBLIC_ENVIRONMENT=production
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
```

Build and start:

```bash
pnpm build
pnpm start
```

Run with PM2:

```bash
pm2 start "pnpm start" --name cyclos-hryvnia
pm2 save
pm2 startup
```

## Nginx Configuration

```nginx
upstream nextjs {
  server 127.0.0.1:3000;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://nextjs;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Redirect HTTP to HTTPS:

```nginx
server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$host$request_uri;
}
```

## Monitoring

### Uptime Monitoring

Use UptimeRobot, Better Stack, or a similar service:

```text
https://your-domain.com/api/health
```

Alert on:

- Non-200 response
- Response timeout
- Elevated latency

### Performance Monitoring

Recommended:

- Vercel Analytics
- Lighthouse CI
- Sentry in Phase 2

Metrics to track:

- Page load time
- Web3Auth connection success rate
- RPC error rate
- Balance fetch latency
- Transaction history fetch latency
- Telegram Mini App opens

## Maintenance

### Weekly

- Check Vercel build logs
- Check `/api/health`
- Review browser console reports from QA
- Review user feedback

### Monthly

- Run dependency audit:

```bash
pnpm audit --audit-level=moderate
```

- Run tests:

```bash
pnpm test
pnpm build
```

- Review bundle size:

```bash
ANALYZE=true pnpm build
```

### Quarterly

- Rotate provider keys where appropriate
- Review Web3Auth domain allowlist
- Review Telegram bot settings
- Review infrastructure and monitoring
- Plan feature releases

## Rollback

On Vercel:

1. Go to **Deployments**.
2. Select the previous healthy deployment.
3. Click **Promote to Production**.

On a custom server:

```bash
git log --oneline
git checkout <previous-good-commit>
pnpm install --frozen-lockfile
pnpm build
pm2 restart cyclos-hryvnia
```

## Deployment Troubleshooting

### Web3Auth login does not open

- Check `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`.
- Check `NEXT_PUBLIC_WEB3AUTH_NETWORK`.
- Add the deployed domain to Web3Auth Domains.
- Confirm the project is set to the same network as the env value.

### Telegram opens a blank screen

- Confirm the Web App URL uses HTTPS.
- Confirm Vercel deployment is not password-protected.
- Check browser console on mobile.
- Verify route `/en`, `/ua`, or `/ru` loads normally.

### Balance fetch fails

- Check `NEXT_PUBLIC_SOLANA_RPC`.
- Verify RPC provider quota.
- Test `/api/rpc/balance?address=11111111111111111111111111111111`.
