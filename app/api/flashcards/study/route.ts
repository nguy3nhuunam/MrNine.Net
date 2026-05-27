import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { cardsCol, notesCol, decksCol } from "@/lib/flashcards/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/flashcards/study?deckId=xxx
 *
 * Returns the next card to review for the deck, with note + deck attached.
 * Selection priority:
 *   1. Learning/relearning cards that are due (millisecond precision)
 *   2. Review cards that are due (within today)
 *   3. New cards, capped at deck.newPerDay per day
 */
export async function GET(request: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const deckId = new URL(request.url).searchParams.get("deckId");
  if (!deckId) return NextResponse.json({ error: "deckId required" }, { status: 400 });

  const decks = await decksCol();
  const cards = await cardsCol();
  const notes = await notesCol();
  if (!decks || !cards || !notes) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  const deck = await decks.findOne({ userId, id: deckId });
  if (!deck) return NextResponse.json({ error: "deck not found" }, { status: 404 });

  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  // Counts
  const newCount = await cards.countDocuments({ userId, deckId, state: "new" });
  const learningCount = await cards.countDocuments({
    userId,
    deckId,
    state: { $in: ["learning", "relearning"] },
  });
  const reviewCount = await cards.countDocuments({
    userId,
    deckId,
    state: "review",
    nextDueAt: { $lte: now },
  });
  const newDoneToday = await cards.countDocuments({
    userId,
    deckId,
    state: { $ne: "new" },
    lastReviewAt: { $gte: dayStartMs },
    reps: 1,
  });

  // 1. Learning/relearning due now
  let card = await cards.findOne(
    {
      userId,
      deckId,
      state: { $in: ["learning", "relearning"] },
      nextDueAt: { $lte: now },
    },
    { sort: { nextDueAt: 1 } },
  );

  // 2. Review due today
  if (!card) {
    card = await cards.findOne(
      { userId, deckId, state: "review", nextDueAt: { $lte: now } },
      { sort: { nextDueAt: 1 } },
    );
  }

  // 3. New cards (respect daily limit)
  if (!card && newDoneToday < (deck.newPerDay ?? 20)) {
    card = await cards.findOne(
      { userId, deckId, state: "new" },
      { sort: { nextDueAt: 1 } },
    );
  }

  if (!card) {
    return NextResponse.json({
      done: true,
      counts: { newCount, learningCount, reviewCount },
    });
  }

  const note = await notes.findOne({ userId, id: card.noteId });
  return NextResponse.json({
    card,
    note,
    deck,
    counts: { newCount, learningCount, reviewCount },
  });
}
