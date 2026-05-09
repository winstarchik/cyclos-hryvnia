# Pre-Launch Checklist

## Code Quality

- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All tests pass
- [ ] Production build succeeds
- [ ] Bundle size reviewed
- [ ] Lighthouse score reviewed

## Security

- [ ] No hardcoded secrets
- [ ] `.env.local` is not committed
- [ ] Environment variables are configured in Vercel
- [ ] HTTPS is enforced
- [ ] Security audit passed
- [ ] Dependencies reviewed
- [ ] Web3Auth production domain whitelist is set
- [ ] Telegram bot token is server-only

## Testing

- [ ] `/en` works
- [ ] `/ua` works
- [ ] `/ru` works
- [ ] Web3Auth Google login works
- [ ] Phantom fallback works
- [ ] Protected pages redirect when disconnected
- [ ] Wallet page opens after login
- [ ] Balance loading/empty/error states work
- [ ] Transaction history loading/empty/error states work
- [ ] QR code renders
- [ ] Address copy works
- [ ] Send form validation works
- [ ] Market charts render
- [ ] Mobile responsive at 375px
- [ ] Tablet responsive at 768px
- [ ] Desktop responsive at 1200px
- [ ] No horizontal scrolling
- [ ] Animations are smooth

## Deployment

- [ ] GitHub repository is up to date
- [ ] Vercel project is connected
- [ ] Vercel build succeeds
- [ ] Production environment variables are set
- [ ] Preview environment variables are set
- [ ] Development environment variables are set
- [ ] `/api/health` returns 200
- [ ] Vercel deployment URL added to Web3Auth Domains
- [ ] Custom domain configured, if applicable

## Telegram Mini App Integration

- [ ] Telegram bot is created
- [ ] Web App URL is configured in BotFather
- [ ] Menu button opens the app
- [ ] App opens in Telegram iOS
- [ ] App opens in Telegram Android
- [ ] App opens in Telegram Web
- [ ] Safe areas look correct
- [ ] Back/close behavior is acceptable

## Documentation

- [ ] README is complete
- [ ] DEPLOYMENT guide is complete
- [ ] ENV documentation is current
- [ ] SECURITY notes are current
- [ ] PERFORMANCE notes are current
- [ ] Known limitations are listed
- [ ] Setup instructions are clear

## Launch

- [ ] GitHub repo visibility reviewed
- [ ] Production URL checked
- [ ] Telegram channels prepared
- [ ] Support contact configured
- [ ] Monitoring enabled
- [ ] First user feedback channel ready
- [ ] Rollback path confirmed

---

Ready to Launch! 🚀

