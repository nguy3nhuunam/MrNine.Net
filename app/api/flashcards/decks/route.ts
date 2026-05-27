import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { decksCol, DEFAULT_DECK_DEFAULTS, newId } from "@/lib/flashcards/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ decks: [] });

  const col = await decksCol();
  if (!col) return NextResponse.json({ decks: [] });

  const decks = await col.find({ userId }).sort({ name: 1 }).toArray();
  return NextResponse.json({ decks });
}

export async function POST(request: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    parentId?: string;
  };
  const name = (body.name ?? "").trim();
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Tên deck 1–80 ký tự." }, { status: 400 });
  }

  const col = await decksCol();
  if (!col) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const deck = {
    id: newId(),
    userId,
    name,
    parentId: body.parentId,
    ...DEFAULT_DECK_DEFAULTS,
    createdAt: Date.now(),
  };
  await col.insertOne(deck as never);
  return NextResponse.json({ deck });
}
