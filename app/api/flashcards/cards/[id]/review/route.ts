import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { cardsCol, decksCol, reviewsCol, newId } from "@/lib/flashcards/db";
import { applyReview } from "@/lib/flashcards/fsrs";
import type { Grade } from "@/lib/flashcards/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    grade?: number;
    durationMs?: number;
  };
  const grade = body.grade as Grade;
  if (![1, 2, 3, 4].includes(grade)) {
    return NextResponse.json({ error: "Grade phải là 1..4" }, { status: 400 });
  }

  const cards = await cardsCol();
  const decks = await decksCol();
  const reviews = await reviewsCol();
  if (!cards || !decks || !reviews) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  const card = await cards.findOne({ userId, id });
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });
  const deck = await decks.findOne({ userId, id: card.deckId });
  if (!deck) return NextResponse.json({ error: "deck not found" }, { status: 404 });

  const now = Date.now();
  const elapsedDays = card.lastReviewAt ? (now - card.lastReviewAt) / 86_400_000 : 0;

  const result = applyReview(card, grade, now, {
    desiredRetention: deck.desiredRetention ?? 0.9,
    learningStepsMin: deck.learningStepsMin ?? [1, 10],
    relearningStepsMin: deck.relearningStepsMin ?? [10],
    leechThreshold: deck.leechThreshold ?? 8,
  });

  const { _id: _drop, ...cardUpdate } = result.card as never as Record<string, unknown>;
  void _drop;
  await cards.updateOne(
    { userId, id },
    { $set: cardUpdate as never },
  );

  await reviews.insertOne({
    id: newId(),
    userId,
    cardId: id,
    grade,
    state: card.state,
    reviewedAt: now,
    intervalDays: result.intervalDays,
    elapsedDays: Math.round(elapsedDays * 100) / 100,
    durationMs: typeof body.durationMs === "number" ? body.durationMs : 0,
  } as never);

  return NextResponse.json({ ok: true, card: result.card, intervalDays: result.intervalDays });
}
