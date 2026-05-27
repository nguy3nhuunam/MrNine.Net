import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { cardsCol, notesCol } from "@/lib/flashcards/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    front?: string;
    back?: string;
    hint?: string;
    tags?: string[];
  };

  const cards = await cardsCol();
  const notes = await notesCol();
  if (!cards || !notes) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // `id` here is the card id; we update the underlying note.
  const card = await cards.findOne({ userId, id });
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const update: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof body.front === "string") update.front = body.front.trim();
  if (typeof body.back === "string") update.back = body.back.trim();
  if (typeof body.hint === "string") update.hint = body.hint.trim();
  if (Array.isArray(body.tags)) update.tags = body.tags.filter((t) => typeof t === "string").slice(0, 16);

  await notes.updateOne({ userId, id: card.noteId }, { $set: update });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { id } = await context.params;
  const cards = await cardsCol();
  const notes = await notesCol();
  if (!cards || !notes) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const card = await cards.findOne({ userId, id });
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

  await cards.deleteOne({ userId, id });
  // Also delete sibling cards from same note (cloze) and the note itself if no cards remain.
  const remaining = await cards.countDocuments({ userId, noteId: card.noteId });
  if (remaining === 0) {
    await notes.deleteOne({ userId, id: card.noteId });
  }
  return NextResponse.json({ ok: true });
}
