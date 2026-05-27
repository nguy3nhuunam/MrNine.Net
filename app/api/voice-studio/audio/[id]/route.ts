import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OMNIVOICE_BASE = process.env.OMNIVOICE_BASE_URL || "http://127.0.0.1:7862";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const { id } = await context.params;
  if (!/^[a-f0-9-]{8,64}$/i.test(id)) {
    return NextResponse.json({ error: "Bad audio id" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${OMNIVOICE_BASE}/api/audio/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Audio not found or expired" },
        { status: upstream.status },
      );
    }
    const blob = await upstream.arrayBuffer();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "OmniVoice unreachable" }, { status: 503 });
  }
}
