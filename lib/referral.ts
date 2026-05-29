/**
 * Referral helpers — generate code + grant bonus.
 *
 * Bonus rules:
 *   - Referee nạp lần đầu (lifetime_topup_micro_usd vừa tăng từ 0 → > 0):
 *     - Referee nhận $1 (1_000_000 micro) "welcome" bonus
 *     - Referrer nhận 10% của topup (capped 5 USD)
 *   - Idempotent qua flag users.referral_bonus_granted
 */
import "server-only";

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { balanceLedger, users } from "@/lib/pg/schema";

const REFEREE_BONUS_MICRO = 1_000_000; // $1
const REFERRER_PCT = 0.10; // 10%
const REFERRER_CAP_MICRO = 5_000_000; // $5 max

export function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // 8 hex chars
}

/** Lookup user by referral code (case-insensitive). Returns id or null. */
export async function lookupReferrer(code: string): Promise<string | null> {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  const row = (
    await db.select({ id: users.id }).from(users).where(eq(users.referralCode, c)).limit(1)
  )[0];
  return row?.id ?? null;
}

/**
 * Gọi sau khi sepay topup completed. Idempotent — chỉ trao bonus 1 lần per referee.
 */
export async function grantReferralBonus(refereeId: string, topupMicroUsd: number): Promise<void> {
  const me = (await db.select().from(users).where(eq(users.id, refereeId)).limit(1))[0];
  if (!me) return;
  if (me.referralBonusGranted) return;
  if (!me.referredBy) {
    // Mark granted=true to skip future check.
    await db.update(users).set({ referralBonusGranted: true }).where(eq(users.id, refereeId));
    return;
  }

  const referrerId = me.referredBy;
  const referrerBonus = Math.min(REFERRER_CAP_MICRO, Math.round(topupMicroUsd * REFERRER_PCT));

  await db.transaction(async (tx) => {
    // Mark first to avoid race.
    const flagged = await tx
      .update(users)
      .set({ referralBonusGranted: true })
      .where(sql`${users.id} = ${refereeId} AND ${users.referralBonusGranted} = false`)
      .returning({ id: users.id });
    if (flagged.length === 0) return; // someone else won the race

    // Credit referee.
    const refereeUpd = await tx
      .update(users)
      .set({ balanceMicroUsd: sql`${users.balanceMicroUsd} + ${REFEREE_BONUS_MICRO}` })
      .where(eq(users.id, refereeId))
      .returning({ balance: users.balanceMicroUsd });
    await tx.insert(balanceLedger).values({
      userId: refereeId,
      kind: "signup_bonus",
      deltaMicroUsd: REFEREE_BONUS_MICRO,
      balanceAfterMicroUsd: Number(refereeUpd[0]?.balance ?? 0),
      requestId: `referral-${refereeId}`,
      note: "Referral welcome bonus ($1)",
    });

    // Credit referrer.
    if (referrerBonus > 0) {
      const refUpd = await tx
        .update(users)
        .set({ balanceMicroUsd: sql`${users.balanceMicroUsd} + ${referrerBonus}` })
        .where(eq(users.id, referrerId))
        .returning({ balance: users.balanceMicroUsd });
      await tx.insert(balanceLedger).values({
        userId: referrerId,
        kind: "adjust",
        deltaMicroUsd: referrerBonus,
        balanceAfterMicroUsd: Number(refUpd[0]?.balance ?? 0),
        requestId: `referral-bonus-${refereeId}`,
        note: `Referral 10% topup bonus (referee=${refereeId})`,
        metadataJson: { referee_id: refereeId, topup_micro_usd: topupMicroUsd },
      });
    }
  });
}
