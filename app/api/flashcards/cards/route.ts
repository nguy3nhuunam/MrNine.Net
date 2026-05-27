import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { cardsCol, decksCol, notesCol, newId } from "@/lib/flashcards/db";
import { newCard } from "@/lib/flashcards/fsrs";
import { parseCloze } from "@/lib/flashcards/cloze";
import type { CardKind } from "@/lib/flashcards/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    deckId?: string;
    kind?: CardKind;
    front?: string;
    back?: string;
    hint?: string;
    tags?: string[];
    imageUrl?: string;
  };

  const kind: CardKind = body.kind === "cloze" || body.kind === "typed" ? body.kind : "basic";
  const deckId = (body.deckId ?? "").trim();
  const front = (body.front ?? "").trim();
  const back = (body.back ?? "").trim();
  if (!deckId) return NextResponse.json({ error: "deckId required" }, { status: 400 });
  if (!front) return NextResponse.json({ error: "Mặt trước rỗng." }, { status: 400 });
  if (kind === "basic" && !back) {
    return NextResponse.json({ error: "Mặt sau rỗng." }, { status: 400 });
  }
  if (kind === "typed" && !back) {
    return NextResponse.json({ error: "Đáp án (mặt sau) rỗng." }, { status: 400 });
  }
  if (kind === "cloze") {
    const parsed = parseCloze(front);
    if (parsed.indices.length === 0) {
      return NextResponse.json(
        { error: "Cloze cần ít nhất 1 đoạn dạng {{c1::từ}}" },
        { status: 400 },
      );
    }
  }

  const decks = await decksCol();
  if (!decks) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const deck = await decks.findOne({ userId, id: deckId });
  if (!deck) return NextResponse.json({ error: "deck not found" }, { status: 404 });

  const notes = await notesCol();
  const cards = await cardsCol();
  if (!notes || !cards) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const now = Date.now();
  const noteId = newId();
  const note = {
    id: noteId,
    userId,
    deckId,
    kind,
    front,
    back,
    hint: body.hint,
    tags: Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string").slice(0, 16) : [],
    imageUrl: body.imageUrl,
    createdAt: now,
    updatedAt: now,
  };
  await notes.insertOne(note as never);

  // Cloze produces 1 card per distinct cloze index. Basic + typed: 1 card.
  let createdCount = 0;
  if (kind === "cloze") {
    const indices = parseCloze(front).indices;
    for (const idx of indices) {
      const card = { ...newCard(noteId, deckId, now), userId, clozeIndex: idx };
      await cards.insertOne(card as never);
      createdCount++;
    }
  } else {
    const card = { ...newCard(noteId, deckId, now), userId };
    await cards.insertOne(card as never);
    createdCount = 1;
  }

  return NextResponse.json({ ok: true, noteId, cardsCreated: createdCount });
}

export async function GET(request: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ notes: [], cards: [] });

  const url = new URL(request.url);
  const deckId = url.searchParams.get("deckId");
  const q = url.searchParams.get("q") || "";

  const notes = await notesCol();
  const cards = await cardsCol();
  if (!notes || !cards) return NextResponse.json({ notes: [], cards: [] });

  const filter: Record<string, unknown> = { userId };
  if (deckId) filter.deckId = deckId;
  if (q) {
    filter.$or = [
      { front: { $regex: q, $options: "i" } },
      { back: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }

  const noteList = await notes.find(filter).sort({ updatedAt: -1 }).limit(500).toArray();
  const noteIds = noteList.map((n) => n.id);
  const cardList = await cards.find({ userId, noteId: { $in: noteIds } }).toArray();
  return NextResponse.json({ notes: noteList, cards: cardList });
}
