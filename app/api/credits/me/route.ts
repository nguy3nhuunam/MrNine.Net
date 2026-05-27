import { NextResponse } from "next/server";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import { getSessionUserId } from "@/lib/user-state";
import { getCredits, redeemCoupon } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function _handler_GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ ok: false, reason: "auth" }, { status: 401 });
  const state = await getCredits(userId);
  if (!state) return NextResponse.json({ ok: false, reason: "no-record" }, { status: 404 });
  return NextResponse.json({ ok: true, ...state });
}

async function _handler_POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ ok: false, reason: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) return NextResponse.json({ ok: false, reason: "missing-code" }, { status: 400 });
  const result = await redeemCoupon(userId, body.code);
  if (!result.ok) {
    const status = result.reason === "not-found" || result.reason === "expired" || result.reason === "used-up" ? 400 : 409;
    return NextResponse.json(result, { status });
  }
  const state = await getCredits(userId);
  return NextResponse.json({ ...result, ...state });
}

export const GET = rateLimitedRoute("credits-me", _handler_GET);
export const POST = rateLimitedRoute("credits-me", _handler_POST);
