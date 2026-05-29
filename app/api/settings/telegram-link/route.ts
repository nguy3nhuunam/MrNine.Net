/**
 * POST /api/settings/telegram-link — sinh token + return deeplink để user copy.
 * Token sống 10 phút, chỉ dùng 1 lần.
 */
import { NextResponse } from "next/server";

import { db } from "@/lib/pg/db";
import { telegramLinkTokens } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import { botDeeplink, generateLinkToken } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const me = await requireUser();
  const token = generateLinkToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(telegramLinkTokens).values({
    token,
    userId: me.id,
    expiresAt,
  });
  return NextResponse.json({
    ok: true,
    token,
    deeplink: botDeeplink(token),
    expires_at: expiresAt.toISOString(),
  });
}
