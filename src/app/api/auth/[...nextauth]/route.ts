import { handlers } from "@/auth";

function cookieNamesFromSetCookie(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookieHeaders = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : response.headers.get("set-cookie")
      ? [response.headers.get("set-cookie")!]
      : [];

  return setCookieHeaders.flatMap((header) => {
    const matches = header.matchAll(/(?:^|,\s*)([^=;,\s]+)=/g);
    return Array.from(matches, (match) => match[1]).filter(Boolean);
  });
}

function requestCookieNames(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(Boolean);
}

function requestHostDiagnostics(request: Request) {
  const url = new URL(request.url);
  return {
    host: request.headers.get("host") ?? url.host,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    pathname: url.pathname
  };
}

function isGoogleSignIn(request: Request) {
  return new URL(request.url).pathname.endsWith("/api/auth/signin/google");
}

function isGoogleCallback(request: Request) {
  return new URL(request.url).pathname.endsWith("/api/auth/callback/google");
}

async function withAuthDiagnostics(request: Request, handler: (request: Request) => Promise<Response>) {
  if (isGoogleCallback(request)) {
    const cookieNames = requestCookieNames(request);
    const hasPkceCookie = cookieNames.some((name) => name.includes("authjs.pkce.code_verifier"));
    console.info("[auth] google callback diagnostics", {
      ...requestHostDiagnostics(request),
      hasPkceCookie,
      userAgent: request.headers.get("user-agent")
    });
  }

  const response = await handler(request);

  if (isGoogleSignIn(request)) {
    console.info("[auth] google sign-in response diagnostics", {
      ...requestHostDiagnostics(request),
      status: response.status,
      setCookieNames: cookieNamesFromSetCookie(response)
    });
  }

  return response;
}

export async function GET(request: Request) {
  return withAuthDiagnostics(request, handlers.GET as (request: Request) => Promise<Response>);
}

export async function POST(request: Request) {
  return withAuthDiagnostics(request, handlers.POST as (request: Request) => Promise<Response>);
}
