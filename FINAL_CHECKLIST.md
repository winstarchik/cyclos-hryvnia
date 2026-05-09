# MVP Launch Checklist

## Completion

- [x] All prompts 1-44 completed or reviewed for MVP scope.
- [x] Functionality working across onboarding, wallet, history, receive, and send pages.
- [x] UI polished with shared buttons, token icons, consistent spacing, and dark theme tokens.
- [x] Mobile responsive at 375px, 768px, and desktop widths.
- [x] Accessibility basics covered: labels, focus states, loading announcements, and touch targets.
- [x] Performance optimized with Next font loading, lazy images, code splitting, and bundle analysis docs.
- [x] Security reviewed with environment docs, health check, headers, and `SECURITY.md`.
- [x] Documentation complete for MVP setup, environment, QA, performance, and limitations.

## Launch Readiness

- [x] Build passes locally with `pnpm build`.
- [x] Unit tests pass with `pnpm test -- --run`.
- [x] TypeScript passes with `pnpm tsc --noEmit`.
- [x] Bottom navigation is integrated and safe-area aware.
- [x] Loading, empty, error, and success states are present where needed.
- [x] i18n files share the same key structure for EN, UA, and RU.
- [x] Vercel configuration exists for deployment.

## Deployment Items

- [ ] Deployed to Vercel.
- [ ] Production environment variables configured in Vercel.
- [ ] TMA bot configured with the production URL.
- [ ] Production wallet connection tested on a real mobile device.

## Known Limitations

- Send execution is not enabled in v1.
- Staking, swaps, advanced charts, and KYC/AML are out of MVP scope.
- cUAH mint address must be replaced before mainnet launch.
- Telegram init data signature verification is planned for the next security phase.
