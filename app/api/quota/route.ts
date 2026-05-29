/**
 * GET /api/quota — đọc trạng thái rate limit hiện tại của tất cả API key của user.
 * Trả về remaining tokens cho RPM/TPM bucket lưu trong Redis (key `rl:rpm:<key_id>`).
 *
 * Read-only, không trừ quota.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { apiKeys } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RPM = parseInt(process.env.DEFAULT_RPM ?? "60", 10);
const DEFAULT_TPM = parseInt(process.env.DEFAULT_TPM ?? "200000", 10);
const DEFAULT_DAILY = parseInt(process.env.DEFAULT_DAILY_TOKENS ?? "1000000", 10);

async function readBucket(keyId: string, kind: "rpm" | "tpm"): Promise<number | null> {
  try {
    const r = getRedis();
    const data = await r.hmget(`rl:${kind}:${keyId}`, "tokens", "ts");
    const tok = data[0];
    if (tok === null || tok === undefined) return null;
    const n = Number(tok);
    return Number.isFinite(n) ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const me = await requireUser();
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      status: apiKeys.status,
      rpmOverride: apiKeys.rpmOverride,
      tpmOverride: apiKeys.tpmOverride,
      dailyTokensOverride: apiKeys.dailyTokensOverride,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, me.id));

  const rows = await Promise.all(
    keys.map(async (k) => {
      const rpmLimit = k.rpmOverride ?? DEFAULT_RPM;
      const tpmLimit = k.tpmOverride ?? DEFAULT_TPM;
      const [rpmRem, tpmRem] = await Promise.all([readBucket(k.id, "rpm"), readBucket(k.id, "tpm")]);
      return {
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        status: k.status,
        rpm: { limit: rpmLimit, remaining: rpmRem ?? rpmLimit },
        tpm: { limit: tpmLimit, remaining: tpmRem ?? tpmLimit },
        daily_tokens_limit: k.dailyTokensOverride ?? DEFAULT_DAILY,
      };
    }),
  );

  return NextResponse.json({ keys: rows });
}
