// MongoDB persistence for flashcards. Documents are scoped per user.
//
// Collections:
//   flashcard_decks   — one per (userId, deckId)
//   flashcard_notes   — one per source content
//   flashcard_cards   — one per scheduled card (cloze produces multiple)
//   flashcard_reviews — append-only log for stats and FSRS retraining

import type { Card, Deck, Note, ReviewLog } from "./types";
import { getCollection } from "@/lib/user-state";

type WithUser<T> = T & { userId: string; _id?: unknown };

export async function decksCol() {
  return getCollection<WithUser<Deck>>("flashcard_decks");
}
export async function notesCol() {
  return getCollection<WithUser<Note>>("flashcard_notes");
}
export async function cardsCol() {
  return getCollection<WithUser<Card>>("flashcard_cards");
}
export async function reviewsCol() {
  return getCollection<WithUser<ReviewLog>>("flashcard_reviews");
}

export const DEFAULT_DECK_DEFAULTS = {
  newPerDay: 20,
  reviewsPerDay: 200,
  algorithm: "fsrs" as const,
  desiredRetention: 0.9,
  learningStepsMin: [1, 10],
  relearningStepsMin: [10],
  leechThreshold: 8,
};

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
