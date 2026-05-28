/**
 * Server-only helpers cho dashboard. Lookup user theo NextAuth session.
 */
import "server-only";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/pg/db";
import { users, type User } from "@/lib/pg/schema";

export async function requireUser(): Promise<User> {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");
  const row = (await db.select().from(users).where(eq(users.email, session.user.email)).limit(1))[0];
  if (!row) redirect("/sign-in");
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
