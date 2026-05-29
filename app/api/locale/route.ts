/**
 * POST /api/locale — set cookie `mrnine_locale`.
 * body: { locale: "vi" | "en" }
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const locale = body.locale === "en" ? "en" : "vi";
  (await cookies()).set("mrnine_locale", locale, {
    maxAge: 365 * 86400,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return NextResponse.json({ ok: true, locale });
}
