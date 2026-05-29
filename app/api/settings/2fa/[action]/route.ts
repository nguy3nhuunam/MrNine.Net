/**
 * 2FA setup flow API.
 *   POST /api/settings/2fa/setup    → return secret + QR + recovery codes (chưa lưu enable)
 *   POST /api/settings/2fa/enable   → { token } verify + flip totp_enabled=true
 *   POST /api/settings/2fa/disable  → { token? | recoveryCode? } verify + flip false
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";

import { db } from "@/lib/pg/db";
import { users } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import {
  buildAuthUri,
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateSecret,
  verifyToken,
} from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await requireUser();
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    recoveryCode?: string;
  };

  if (action === "setup") {
    const secret = generateSecret();
    const codes = generateRecoveryCodes();
    const uri = buildAuthUri(me.email, secret);
    const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1 });
    // Lưu pending secret + codes, totp_enabled vẫn = false đến khi user verify.
    await db
      .update(users)
      .set({ totpSecret: secret, recoveryCodes: codes, totpEnabled: false })
      .where(eq(users.id, me.id));
    return NextResponse.json({
      ok: true,
      secret,
      uri,
      qr_data_url: qr,
      recovery_codes: codes,
    });
  }

  if (action === "enable") {
    const me2 = (await db.select().from(users).where(eq(users.id, me.id)).limit(1))[0];
    if (!me2?.totpSecret) {
      return NextResponse.json({ error: "no_secret_setup" }, { status: 400 });
    }
    if (!verifyToken(body.token ?? "", me2.totpSecret)) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
    await db.update(users).set({ totpEnabled: true }).where(eq(users.id, me.id));
    return NextResponse.json({ ok: true });
  }

  if (action === "disable") {
    const me2 = (await db.select().from(users).where(eq(users.id, me.id)).limit(1))[0];
    if (!me2?.totpEnabled) return NextResponse.json({ ok: true, ignored: "not_enabled" });

    const tokenOk = me2.totpSecret ? verifyToken(body.token ?? "", me2.totpSecret) : false;
    let recOk = false;
    let remaining = me2.recoveryCodes ?? null;
    if (!tokenOk && body.recoveryCode) {
      const r = consumeRecoveryCode(body.recoveryCode, me2.recoveryCodes);
      recOk = r.ok;
      if (r.ok) remaining = r.remaining;
    }
    if (!tokenOk && !recOk) {
      return NextResponse.json({ error: "invalid_token_or_recovery" }, { status: 400 });
    }
    await db
      .update(users)
      .set({
        totpEnabled: false,
        totpSecret: null,
        recoveryCodes: null,
      })
      .where(eq(users.id, me.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
