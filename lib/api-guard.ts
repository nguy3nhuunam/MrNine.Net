// Composable guard for API routes — combines:
//  1. rate limit (Mongo TTL buckets, anon/IP vs user/userId)
//  2. JSON-safe error wrapper (catches throws, returns JSON instead of HTML)
//  3. optional auth (returns 401 if no session)
//  4. optional credit charge (returns 402 if out of credits)
//
// Use on every route that performs paid work or talks to a flaky upstream.
// Cheap reads (markets cache, og image, site-config) can keep the bare
// safeJsonRoute wrapper.

import { NextResponse } from "next/server";
import { rateLimitForRequest, rateLimitResponse, type RateLimitOptions } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { chargeCredits, refundCredits, type ChargeKind } from "@/lib/credits";

export type GuardOptions = {
  // Logical name for rate-limit + telemetry. Defaults to handler.name.
  route: string;
  // Per-tier rate limit ceilings; falls back to defaults in lib/rate-limit.
  rate?: { anon?: RateLimitOptions; user?: RateLimitOptions };
  // Require a signed-in user; sends 401 otherwise.
  requireUser?: boolean;
  // Charge this kind on success; refunds on handler throw or non-2xx.
  charge?: ChargeKind;
};

// Extend the request scope with a `charged` field via the second handler arg
// so handlers can refund themselves on partial failures (e.g. upstream 5xx
// after a successful charge). The wrapper still auto-refunds on throw.
export type GuardContext = {
  userId: string | null;
  charged: number;
  refund: (amount?: number) => Promise<void>;
};

export function guardedRoute<Args extends unknown[]>(
  opts: GuardOptions,
  handler: (request: Request, ctx: GuardContext, ...rest: Args) => Promise<Response> | Response,
): (request: Request, ...rest: Args) => Promise<Response> {
  return async (request, ...rest) => {
    try {
      const limit = await rateLimitForRequest(opts.route, opts.rate);
      if (!limit.ok) return rateLimitResponse(limit);

      if (opts.requireUser) {
        const blocked = await requireAuth();
        if (blocked) return blocked;
      }

      const userId = await getSessionUserId();
      let charged = 0;

      if (opts.charge && userId) {
        const result = await chargeCredits(userId, opts.charge);
        if (!result.ok) {
          if (result.reason === "insufficient") {
            return NextResponse.json(
              {
                code: "insufficient_credits",
                error: "Hết credits chu kỳ này. Hãy đợi reset hoặc nhập coupon.",
              },
              { status: 402 },
            );
          }
        } else {
          charged = result.charged;
        }
      }

      const ctx: GuardContext = {
        userId,
        charged,
        refund: async (amount = charged) => {
          if (!userId || amount <= 0) return;
          await refundCredits(userId, amount);
          charged = Math.max(0, charged - amount);
        },
      };

      try {
        const response = await handler(request, ctx, ...rest);
        if (charged > 0 && (response.status < 200 || response.status >= 300)) {
          await ctx.refund(charged);
        }
        return response;
      } catch (err) {
        if (charged > 0) await ctx.refund(charged);
        throw err;
      }
    } catch (err) {
      console.error(`[guardedRoute:${opts.route}] handler threw:`, err);
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

