# Bundle Analysis

Date: 2026-05-09 (Europe/Berlin)

## Analyzer Setup

Bundle analyzer is configured in `next.config.js` and runs when `ANALYZE=true`.

```bash
$env:ANALYZE="true"; corepack pnpm build
```

Generated reports:

- `.next/analyze/client.html`
- `.next/analyze/nodejs.html`
- `.next/analyze/edge.html`

The reports are build artifacts and are not committed.

## Current First Load Size

Production build: Next.js 15.5.18

| Route | First-load JS gzip | Status |
| --- | ---: | --- |
| `/[locale]` | 115.5 KB | Pass |
| `/[locale]/wallet` | 116.7 KB | Pass |
| `/[locale]/history` | 115.7 KB | Pass |
| `/[locale]/receive` | 116.0 KB | Pass |
| `/[locale]/send` | 116.5 KB | Pass |

Targets:

- Route first-load JS: under 120 KB gzip
- Route total first load: under 200 KB gzip
- CSS: under 20 KB gzip

CSS result:

- CSS bundle: 8.6 KB gzip

Static build artifact totals across all chunks:

- All JS chunks together: 397.8 KB gzip
- All CSS chunks together: 8.6 KB gzip
- All JS/CSS chunks together: 406.5 KB gzip

Note: the all-chunks total includes wallet, Solana, Web3Auth, QR, and route chunks. It is not downloaded on first page load.

## Largest Client Assets

| Asset | Gzip |
| --- | ---: |
| React DOM framework chunk | 58.4 KB |
| Next shared app chunk | 53.0 KB |
| Lazy Solana dependency chunk | 52.5 KB |
| Next shared runtime chunk | 44.9 KB |
| Polyfills chunk | 38.6 KB |
| Main runtime chunk | 34.7 KB |
| Lazy Solana web3 chunk | 29.4 KB |
| Web3Auth SDK chunk | TBD after analyzer rerun |
| `next-intl` / `use-intl` client chunk | 11.9 KB |
| CSS | 8.6 KB |
| Lazy QR code chunk | 5.8 KB |

## Largest Dependencies

| Dependency | Gzip impact | Notes |
| --- | ---: | --- |
| Next.js runtime | 206.5 KB across chunks | Framework/runtime cost spread across routes |
| React DOM | 54.8 KB | Core UI runtime |
| `@solana/web3.js` | 29.4 KB direct chunk, plus crypto dependencies | Lazy-loaded for RPC work |
| `@noble/curves` | 16.8 KB | Solana crypto dependency |
| App source | 16.0 KB | Pages, hooks, stores, UI |
| `@web3auth/modal` | TBD after analyzer rerun | Used for Google embedded wallet login |
| `next-intl` / `use-intl` | 11.8 KB | Shared client translations |
| `qrcode.react` | 5.8 KB | Lazy-loaded on receive page |

## Optimizations Applied

- Kept `@next/bundle-analyzer` enabled behind `ANALYZE=true`.
- Removed `date-fns` from runtime dependencies and replaced `formatDistanceToNow` with `Intl.RelativeTimeFormat`.
- Removed `zustand/devtools` from the production wallet store bundle.
- Lazy-loaded `TokenList` with `React.lazy` so token logo rendering and `next/image` code do not inflate the wallet first load.
- Kept QR code rendering behind a dynamic import.
- Kept Solana RPC utilities behind balance/history fetches and Web3Auth behind the login surface.
- Used plain header action anchors on the wallet page to avoid adding an extra `next/link` chunk there.
- Kept font loading optimized through `next/font` with `display: "swap"`.
- Kept Tailwind CSS purged by the production build; final CSS is 8.6 KB gzip.

## Future Optimizations

- Replace or isolate `@solana/web3.js` further if transaction execution grows; it remains the largest non-framework lazy dependency.
- Add a bundle budget check in CI so route first-load JS cannot regress above 120 KB gzip unnoticed.
- Keep charting, swaps, and analytics SDKs behind route-level dynamic imports.
- Consider reducing client-side translation usage on very static shells if `next-intl` becomes a bottleneck.
- Run Lighthouse on the deployed Vercel preview URL and track Core Web Vitals over time.

## Monitoring Plan

- Use Vercel Analytics for Core Web Vitals.
- Re-run `ANALYZE=true corepack pnpm build` before major releases.
- Track route first-load JS for wallet, receive, send, and history pages.
- Treat any new dependency over 10 KB gzip as requiring justification.
