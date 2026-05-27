// Per-user credit metering. Stored in `users` collection alongside the
// account doc that next-auth/MongoDB adapter already owns.
//
// Each user has:
//   credits: { used, plan, cycleStart, redeemedCoupons[] }
// where used resets to 0 on each cycleStart anniversary.
//
// Cost table is the single source of truth for what every action costs.
// Routes that perform paid work should `chargeCredits(userId, kind)` and
// only proceed when it returns ok=true. If the model call itself fails,
// the route should `refundCredits(userId, charged)` so we don't bill for
// a no-op.

import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/user-state";

export type Plan = "free" | "pro";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 200,
  pro: 5000,
};

export const CYCLE_DAYS = 30;

// Credits per action. Tune as the cost/value balance evolves.
export const COST_TABLE = {
  "ask-anything": 3,
  "language-tutor": 4,
  "mystic-interpret": 8,
  "playground-image": 10,
  "playground-video": 25,
  "playground-motion": 25,
  "smart-recap": 12,
  "docsense": 12,
  "story-write": 8,
  "story-revise": 6,
  "story-cover": 25,
  "flashcards-generate": 6,
} as const;

export type ChargeKind = keyof typeof COST_TABLE;

export type CreditsState = {
  plan: Plan;
  used: number;
  limit: number;
  cycleStart: Date;
  resetAt: Date;
  redeemedCoupons: string[];
};

type UserDoc = {
  _id: ObjectId;
  credits?: {
    plan?: Plan;
    used?: number;
    cycleStart?: Date;
    redeemedCoupons?: string[];
  };
};

function makeObjectId(userId: string): ObjectId | null {
  try {
    return new ObjectId(userId);
  } catch {
    return null;
  }
}

function startOfCycle(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function nextResetFrom(cycleStart: Date): Date {
  const reset = new Date(cycleStart);
  reset.setUTCDate(reset.getUTCDate() + CYCLE_DAYS);
  return reset;
}

export async function getCredits(userId: string): Promise<CreditsState | null> {
  const collection = await getCollection<UserDoc>("users");
  if (!collection) return null;
  const objectId = makeObjectId(userId);
  if (!objectId) return null;
  const user = await collection.findOne({ _id: objectId });
  if (!user) return null;
  const now = new Date();
  let cycleStart = user.credits?.cycleStart ? new Date(user.credits.cycleStart) : startOfCycle(now);
  let used = user.credits?.used ?? 0;
  const plan = user.credits?.plan ?? "free";
  const redeemed = user.credits?.redeemedCoupons ?? [];

  // Roll over cycle if expired.
  if (now.getTime() >= nextResetFrom(cycleStart).getTime()) {
    cycleStart = startOfCycle(now);
    used = 0;
    await collection.updateOne(
      { _id: objectId },
      { $set: { "credits.used": 0, "credits.cycleStart": cycleStart, "credits.plan": plan } },
    );
  }

  return {
    plan,
    used,
    limit: PLAN_LIMITS[plan],
    cycleStart,
    resetAt: nextResetFrom(cycleStart),
    redeemedCoupons: redeemed,
  };
}

export async function chargeCredits(userId: string, kind: ChargeKind): Promise<{ ok: true; charged: number; remaining: number } | { ok: false; reason: "insufficient" | "no-user"; charged: 0 }> {
  const cost = COST_TABLE[kind];
  const state = await getCredits(userId);
  if (!state) return { ok: false, reason: "no-user", charged: 0 };
  if (state.used + cost > state.limit) {
    return { ok: false, reason: "insufficient", charged: 0 };
  }
  const collection = await getCollection<UserDoc>("users");
  if (!collection) return { ok: false, reason: "no-user", charged: 0 };
  const objectId = makeObjectId(userId);
  if (!objectId) return { ok: false, reason: "no-user", charged: 0 };
  await collection.updateOne(
    { _id: objectId },
    { $inc: { "credits.used": cost }, $setOnInsert: { "credits.cycleStart": state.cycleStart, "credits.plan": state.plan } },
    { upsert: false },
  );
  return { ok: true, charged: cost, remaining: state.limit - (state.used + cost) };
}

export async function refundCredits(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const collection = await getCollection<UserDoc>("users");
  if (!collection) return;
  const objectId = makeObjectId(userId);
  if (!objectId) return;
  await collection.updateOne(
    { _id: objectId },
    { $inc: { "credits.used": -amount } },
  );
}

// Coupon system: documents in `coupons` collection of shape:
//   { code, value, usesLeft?, expiresAt?, plan? }
// Successful redeem either grants -value used credits or upgrades plan.
type CouponDoc = {
  _id?: ObjectId;
  code: string;
  value?: number;
  plan?: Plan;
  usesLeft?: number;
  expiresAt?: Date;
};

export async function redeemCoupon(userId: string, codeRaw: string): Promise<{ ok: true; message: string; granted: number; plan?: Plan } | { ok: false; reason: "not-found" | "expired" | "used-up" | "already-redeemed" | "no-user" }> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, reason: "not-found" };
  const collection = await getCollection<UserDoc>("users");
  const coupons = await getCollection<CouponDoc>("coupons");
  if (!collection || !coupons) return { ok: false, reason: "no-user" };
  const objectId = makeObjectId(userId);
  if (!objectId) return { ok: false, reason: "no-user" };

  const user = await collection.findOne({ _id: objectId });
  const redeemed = user?.credits?.redeemedCoupons ?? [];
  if (redeemed.includes(code)) return { ok: false, reason: "already-redeemed" };

  const coupon = await coupons.findOne({ code });
  if (!coupon) return { ok: false, reason: "not-found" };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (typeof coupon.usesLeft === "number" && coupon.usesLeft <= 0) {
    return { ok: false, reason: "used-up" };
  }

  const grant = Math.max(0, coupon.value ?? 0);
  const upgradedPlan = coupon.plan;

  await collection.updateOne(
    { _id: objectId },
    {
      $inc: { "credits.used": -grant },
      ...(upgradedPlan ? { $set: { "credits.plan": upgradedPlan } } : {}),
      $addToSet: { "credits.redeemedCoupons": code },
    },
  );
  if (typeof coupon.usesLeft === "number") {
    await coupons.updateOne({ code }, { $inc: { usesLeft: -1 } });
  }

  return {
    ok: true,
    message: upgradedPlan ? `Đã nâng cấp lên ${upgradedPlan}` : `+${grant} credits`,
    granted: grant,
    plan: upgradedPlan,
  };
}
