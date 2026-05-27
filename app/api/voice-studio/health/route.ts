import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OMNIVOICE_BASE = process.env.OMNIVOICE_BASE_URL || "http://127.0.0.1:7862";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const upstream = await fetch(`${OMNIVOICE_BASE}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    const data = await upstream.json();
    return NextResponse.json({ ok: Boolean(data?.ok), ...data });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        loaded: false,
        message:
          "OmniVoice server chưa chạy. Khởi động ở máy local: python webai_server.py --port 7862",
      },
      { status: 503 },
    );
  }
}
