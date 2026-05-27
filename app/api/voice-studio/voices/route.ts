import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OMNIVOICE_BASE = process.env.OMNIVOICE_BASE_URL || "http://127.0.0.1:7862";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  try {
    const upstream = await fetch(`${OMNIVOICE_BASE}/api/voices`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ presets: [] });
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ presets: [] });
  }
}
