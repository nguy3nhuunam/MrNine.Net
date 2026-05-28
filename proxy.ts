import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

const PUBLIC_PATHS = new Set<string>(["/", "/about", "/legal/privacy", "/legal/terms"]);
const PUBLIC_PREFIXES: ReadonlyArray<string> = [
  "/api/auth",
  "/api/health",
  "/api/track",
  "/api/billing/sepay",
  "/voice-studio-runtime",
  "/_next",
];

function hasSessionCookie(request: NextRequest): boolean {
  for (const name of SESSION_COOKIE_NAMES) {
    if (request.cookies.get(name)?.value) {
      return true;
    }
  }
  return false;
}

function shouldEnforceAuth(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return false;
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return false;
  }
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const referer = request.headers.get("referer") || "";

  // Voice Studio (Gradio) static asset rewrites — must run before auth.
  if (
    (pathname.startsWith("/gradio_api/") ||
      pathname.startsWith("/queue/") ||
      pathname.startsWith("/theme.css") ||
      pathname.startsWith("/static/")) &&
    referer.includes("/voice-studio-runtime")
  ) {
    return NextResponse.rewrite(new URL(`http://127.0.0.1:7861${pathname}${request.nextUrl.search}`));
  }

  // Auth gate.
  if (shouldEnforceAuth(pathname) && !hasSessionCookie(request)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Cần đăng nhập để sử dụng tính năng này." },
        { status: 401 },
      );
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("login", "1");
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|map)).*)",
  ],
};
