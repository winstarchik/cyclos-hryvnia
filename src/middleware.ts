import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "ua", "ru"],
  defaultLocale: "en",
});

export const config = {
  matcher: ["/", "/(en|ua|ru)/:path*"],
};

