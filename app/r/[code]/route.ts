/**
 * GET /r/[code] — set referral cookie + redirect tới /sign-up.
 *
 * Cookie tồn tại 30 ngày, được đọc khi user OAuth signup lần đầu.
 */
import { NextResponse } from "next/server";
import { lookupReferrer } from "@/lib/referral";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const c = (code ?? "").trim().toUpperCase();
  const exists = await lookupReferrer(c);
  const res = NextResponse.redirect(new URL("/sign-up", process.env.APP_URL ?? "https://mrnine.net"));
  if (exists) {
    res.cookies.set("mrnine_ref", c, {
      maxAge: 30 * 86400,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
