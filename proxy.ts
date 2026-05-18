import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const referer = request.headers.get("referer") || "";

  if (
    (pathname.startsWith("/assets/") ||
      pathname.startsWith("/gradio_api/") ||
      pathname.startsWith("/queue/") ||
      pathname.startsWith("/theme.css") ||
      pathname.startsWith("/static/")) &&
    (referer.includes("/voice-studio-runtime") ||
      (pathname.startsWith("/assets/") && referer.length === 0))
  ) {
    return NextResponse.rewrite(new URL(`http://127.0.0.1:7861${pathname}${request.nextUrl.search}`));
  }

  if (pathname === "/inkos-studio" || pathname.startsWith("/inkos-studio/")) {
    const destination = request.headers.get("sec-fetch-dest");

    if (destination !== "iframe") {
      return NextResponse.redirect(new URL("/story-forge", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/inkos-studio",
    "/inkos-studio/:path*",
    "/assets/:path*",
    "/gradio_api/:path*",
    "/queue/:path*",
    "/theme.css",
    "/static/:path*",
  ],
};
