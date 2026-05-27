// Per-(subject, route) rate limiting backed by a Mongo TTL collection so it
// survives across Vercel serverless instances. Two fixed-window buckets:
// per-minute and per-hour. Doc keyed by `${subject}|${route}|m${bucket}`
// (or `h${bucket}`) and auto-deleted after window end via TTL index.
//
// Subject is `u:<userId>` for signed-in calls, `ip:<addr>` for anon. Routes
// that need a tighter ceiling pass per-route opts. The helper falls open
// (allows the request) when Mongo is unavailable so dev without a DB still
// works.

import { headers } from "next/headers";
import { getCollection, getSessionUserId } from "@/lib/user-state";

export type RateLimitTier = "anon" | "user";
export type RateLimitOptions = {
  perMinute?: number;
  perHour?: number;
};

const DEFAULTS: Record<RateLimitTier, Required<RateLimitOptions>> = {
  anon: { perMinute: 5, perHour: 30 },
  user: { perMinute: 30, perHour: 200 },
};

type RateDoc = {
  _id: string;
  count: number;
  expiresAt: Date;
};

let indexEnsured = false;

async function ensureIndex() {
  if (indexEnsured) return;
  const col = await getCollection<RateDoc>("rate_limits");
  if (!col) return;
  try {
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch {
    // index may already exist with different options; ignore
  }
  indexEnsured = true;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
}

export type RateLimitResult =
  | { ok: true; remaining: number; tier: RateLimitTier; subject: string }
  | { ok: false; retryAfter: number; window: "minute" | "hour"; tier: RateLimitTier; subject: string };

async function increment(
  subject: string,
  route: string,
  tier: RateLimitTier,
  opts: RateLimitOptions | undefined,
): Promise<RateLimitResult> {
  const cfg = { ...DEFAULTS[tier], ...opts };
  const col = await getCollection<RateDoc>("rate_limits");
  if (!col) {
    return { ok: true, remaining: cfg.perMinute, tier, subject };
  }
  await ensureIndex();

  const now = Date.now();
  const minuteBucket = Math.floor(now / 60_000);
  const hourBucket = Math.floor(now / 3_600_000);

  const minuteId = `${subject}|${route}|m${minuteBucket}`;
  const hourId = `${subject}|${route}|h${hourBucket}`;

  const minuteExpires = new Date((minuteBucket + 1) * 60_000);
  const hourExpires = new Date((hourBucket + 1) * 3_600_000);

  const [mDoc, hDoc] = await Promise.all([
    col.findOneAndUpdate(
      { _id: minuteId },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: minuteExpires } },
      { upsert: true, returnDocument: "after" },
    ),
    col.findOneAndUpdate(
      { _id: hourId },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: hourExpires } },
      { upsert: true, returnDocument: "after" },
    ),
  ]);

  const minuteCount = mDoc?.count ?? 1;
  const hourCount = hDoc?.count ?? 1;

  if (minuteCount > cfg.perMinute) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((minuteExpires.getTime() - now) / 1000)),
      window: "minute",
      tier,
      subject,
    };
  }
  if (hourCount > cfg.perHour) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((hourExpires.getTime() - now) / 1000)),
      window: "hour",
      tier,
      subject,
    };
  }
  return {
    ok: true,
    remaining: Math.min(cfg.perMinute - minuteCount, cfg.perHour - hourCount),
    tier,
    subject,
  };
}

// Tag a request with its rate-limit subject (user id or IP) and check the
// per-tier bucket. Use this from any public API route — anon callers are
// keyed by IP, signed-in callers by user id.
export async function rateLimitForRequest(
  route: string,
  opts?: { anon?: RateLimitOptions; user?: RateLimitOptions },
): Promise<RateLimitResult> {
  const userId = await getSessionUserId();
  if (userId) {
    return increment(`u:${userId}`, route, "user", opts?.user);
  }
  const ip = await getClientIp();
  return increment(`ip:${ip}`, route, "anon", opts?.anon);
}

export function rateLimitResponse(
  result: Extract<RateLimitResult, { ok: false }>,
): Response {
  return new Response(
    JSON.stringify({
      code: "rate_limited",
      message:
        result.window === "minute"
          ? "Bạn đang gửi quá nhanh. Thử lại sau ít giây."
          : "Đã vượt mức sử dụng theo giờ. Quay lại sau.",
      window: result.window,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
      },
    },
  );
}
