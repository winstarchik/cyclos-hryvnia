# Mobile QA Report

Date: 2026-05-09 (Europe/Berlin)  
Automated run timestamp: 2026-05-08T22:58:20.579Z

## Scope

Tested the mobile-first wallet experience on the production build served locally with `next start`.

Routes covered:

- `/ru`
- `/ru/wallet`
- `/ru/history`
- `/ru/receive`
- `/ru/send`

Viewports covered:

- iPhone SE portrait: 375 x 667
- iPhone SE landscape: 667 x 375
- iPad portrait: 768 x 1024
- iPad landscape: 1024 x 768
- Desktop: 1200 x 900

## Results

Automated viewport checks: 25

- Horizontal overflow: 0 failures
- Touch targets under 44px height: 0 failures
- Visible text under 12px: 0 failures
- Runtime/browser console errors: 0 failures
- Missing bottom navigation on app pages: 0 failures

Mobile form checks:

- Send page inputs render at 50px height on iPhone SE.
- Amount input uses `inputMode="decimal"` for a better mobile keyboard.
- Recipient address input disables autocorrect and autocapitalization.
- Send form supports Enter/Return submit behavior while still using the v1 "coming soon" stub.

Navigation checks:

- Bottom navigation is fixed at the bottom on wallet, history, receive, and send pages.
- Bottom navigation includes safe-area padding via `env(safe-area-inset-bottom)`.
- Bottom navigation links include localized labels and `aria-label` values.
- Page padding keeps content clear of the bottom nav.

## Polish Applied

- Removed the mobile-only `html { font-size: 15px; }` override so Tailwind `text-xs` remains at 12px and passes the minimum readable text check.
- Localized bottom navigation labels for English, Ukrainian, and Russian.
- Added explicit accessible labels to bottom navigation links.
- Improved mobile behavior of the send form fields.
- Replaced the receive-page copied checkmark source literal with a Unicode escape to keep the source encoding stable.

## Verification Commands

```bash
corepack pnpm exec tsc --noEmit
corepack pnpm test -- --run
corepack pnpm build
```

Results:

- TypeScript: passed
- Vitest: 2 files passed, 23 tests passed
- Next.js build: passed

## Known Limitations

- Real-device iOS VoiceOver and Android TalkBack were not physically tested in this pass.
- Mobile keyboard behavior was checked through field semantics and layout, not through an actual OS keyboard overlay.
- Real Phantom/Magic wallet connection was not end-to-end tested on a mobile device during this QA pass.
- Telegram Mini App embedding should still be validated on a real Telegram client before production launch.
- Lighthouse was not run in this pass; run it against the Vercel preview URL for final Core Web Vitals numbers.

## Recommended Final Device Checks

- Open the Vercel preview on iPhone and Android.
- Test Telegram Mini App launch inside Telegram.
- Connect with Phantom mobile and Magic Link test keys.
- Verify QR copy flow with the real clipboard permission model.
- Run Lighthouse mobile on the deployed HTTPS URL.
