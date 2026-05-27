// Server-side wrapper so every route handler returns JSON, even on crash.
//
// Without this, an unhandled throw bubbles up to Next.js which may produce
// HTML or plain-text responses (especially on Vercel timeouts). The client
// then JSON-parses that and crashes with "Unexpected token 'A'..." This
// guarantees we never send non-JSON to the client.
//
// For routes that talk to flaky upstreams or perform paid work, prefer
// `guardedRoute` from lib/api-guard.ts — it adds rate limiting, auth, and
// credit charging on top of this.

import { NextResponse } from "next/server";
import { rateLimitForRequest, rateLimitResponse } from "@/lib/rate-limit";

type AnyHandler = (...args: never[]) => Promise<Response> | Response;

export function safeJsonRoute<T extends AnyHandler>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("[safeJsonRoute] handler threw:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }) as unknown as T;
}

// Lighter version of guardedRoute: rate-limit + JSON-safe wrapper, no auth
// or credit machinery. Use for read-only routes (markets, og fallback,
// site-config) that should still be flood-protected.
export function rateLimitedRoute<T extends AnyHandler>(routeKey: string, handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      const limit = await rateLimitForRequest(routeKey);
      if (!limit.ok) return rateLimitResponse(limit);
      return await handler(...args);
    } catch (error) {
      console.error(`[rateLimitedRoute:${routeKey}] handler threw:`, error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }) as unknown as T;
}

