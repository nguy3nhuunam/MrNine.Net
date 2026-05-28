/**
 * Server-only helpers cho dashboard. Lookup user theo NextAuth session.
 *
 * Nếu session OAuth (Google/Discord) tồn tại nhưng chưa có row Postgres → auto-create.
 * Đảm bảo user dùng OAuth vẫn có balance/api_keys.
 */
import "server-only";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/pg/db";
import { balanceLedger, users, type User } from "@/lib/pg/schema";

const SIGNUP_FREE_USD = parseFloat(process.env.SIGNUP_FREE_CREDIT_USD ?? "0.5");

export async function requireUser(): Promise<User> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) redirect("/sign-in");

  let row = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!row) {
    const free = Math.round(SIGNUP_FREE_USD * 1_000_000);
    const inserted = await db
      .insert(users)
      .values({
        email,
        displayName: session?.user?.name ?? null,
        balanceMicroUsd: free,
      })
      .returning();
    row = inserted[0];
    if (free > 0 && row) {
      await db.insert(balanceLedger).values({
        userId: row.id,
        kind: "signup_bonus",
        deltaMicroUsd: free,
        balanceAfterMicroUsd: free,
        note: "Welcome bonus (OAuth)",
      });
    }
  }
  return row;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (!u.isAdmin) redirect("/dashboard");
  return u;
}

export function microUsdToUsd(micro: number): string {
  return (micro / 1_000_000).toFixed(4);
}

export function microUsdToVnd(micro: number): number {
  const rate = parseInt(process.env.USD_VND_RATE ?? "25500", 10);
  return Math.round((micro / 1_000_000) * rate);
}

export function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
