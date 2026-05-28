import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/lib/pg/db";
import { balanceLedger, users } from "@/lib/pg/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_USD = parseFloat(process.env.SIGNUP_FREE_CREDIT_USD ?? "0.5");

export async function POST(req: Request) {
  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  const displayName = body.displayName ? String(body.displayName).trim().slice(0, 120) : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const freeMicro = Math.round(FREE_USD * 1_000_000);

  const inserted = await db
    .insert(users)
    .values({
      email,
      passwordHash: hash,
      displayName,
      balanceMicroUsd: freeMicro,
      lifetimeTopupMicroUsd: 0,
    })
    .returning({ id: users.id });

  if (freeMicro > 0 && inserted[0]) {
    await db.insert(balanceLedger).values({
      userId: inserted[0].id,
      kind: "signup_bonus",
      deltaMicroUsd: freeMicro,
      balanceAfterMicroUsd: freeMicro,
      note: "Welcome bonus",
    });
  }

  return NextResponse.json({ ok: true });
}
