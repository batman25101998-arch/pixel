import { NextResponse } from "next/server";
import { auth } from "@/auth";

const CANONICAL_PRODUCTION_ORIGIN = "https://hexofearth.com";
const CANONICAL_PRODUCTION_HOST = "hexofearth.com";

function shouldCanonicalizeHost(host: string) {
  return (
    process.env.NODE_ENV === "production" &&
    host !== CANONICAL_PRODUCTION_HOST &&
    (host === `www.${CANONICAL_PRODUCTION_HOST}` || host.endsWith(".vercel.app"))
  );
}

export default auth((request) => {
  const requestUrl = request.nextUrl;
  const requestHost = requestUrl.host;
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (requestUrl.pathname.startsWith("/api/auth")) {
    console.info("[auth] auth route host", {
      requestHost,
      forwardedHost,
      pathname: requestUrl.pathname
    });
  }

  if (shouldCanonicalizeHost(requestHost)) {
    const canonicalUrl = new URL(requestUrl.pathname + requestUrl.search, CANONICAL_PRODUCTION_ORIGIN);
    console.info("[auth] canonical host redirect", {
      requestHost,
      forwardedHost,
      destinationHost: canonicalUrl.host,
      pathname: requestUrl.pathname
    });
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (requestUrl.pathname.startsWith("/admin")) {
    if (!request.auth?.user?.id) return NextResponse.redirect(new URL("/sign-in", requestUrl));
    if (request.auth.user.role !== "ADMIN" || request.auth.user.banned) {
      return NextResponse.redirect(new URL("/", requestUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|og-image.png|site.webmanifest).*)"]
};
