// Server-side wrapper so every route handler returns JSON, even on crash.
//
// Without this, an unhandled throw bubbles up to Next.js which may produce
// HTML or plain-text responses (especially on Vercel timeouts). The client
// then JSON-parses that and crashes with "Unexpected token 'A'..." This
// guarantees we never send non-JSON to the client.

import { NextResponse } from "next/server";

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
