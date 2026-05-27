import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const OMNIVOICE_BASE = process.env.OMNIVOICE_BASE_URL || "http://127.0.0.1:7862";

export async function POST(request: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body = await request.formData();

  try {
    const upstream = await fetch(`${OMNIVOICE_BASE}/api/clone`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(110_000),
    });
    const text = await upstream.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { ok: false, message: `Upstream returned non-JSON (${upstream.status})` },
        { status: 502 },
      );
    }
    return NextResponse.json(json, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? `OmniVoice unreachable: ${error.message}`
            : "OmniVoice unreachable",
      },
      { status: 503 },
    );
  }
}
