// Flashcards domain types — shared between API + UI.

export type CardKind = "basic" | "cloze" | "typed";

export type CardState = "new" | "learning" | "review" | "relearning";

export type Grade = 1 | 2 | 3 | 4; // Again / Hard / Good / Easy

/**
 * A note holds the source content. One note can produce multiple cards
 * (e.g. cloze with c1, c2, c3 → 3 cards), but for MVP we keep it 1:1.
 */
export type Note = {
  id: string;
  deckId: string;
  kind: CardKind;
  // For basic: front = question, back = answer.
  // For typed: same as basic but UI asks user to type the answer.
  // For cloze: front holds the source text with {{c1::...}} markers; back is unused.
  front: string;
  back: string;
  hint?: string;
  tags: string[];
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * A card is the SR scheduling unit. We use FSRS-6 by default.
 *
 * stability:    days until retrievability drops to 0.9 (target retention)
 * difficulty:   1..10 (the "D" in FSRS, persistent property of the card)
 * lastReviewAt: ms epoch — undefined for unseen cards
 * nextDueAt:    ms epoch — when this card should be shown again
 * reps:         total successful reviews (for SM-2 fallback + stats)
 * lapses:       count of "Again" presses on review/relearning cards
 */
export type Card = {
  id: string;
  noteId: string;
  deckId: string;
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  step: number;             // current learning step index, 0 if review
  lastReviewAt?: number;
  nextDueAt: number;
  suspended?: boolean;
  leech?: boolean;
};

export type Deck = {
  id: string;
  name: string;
  parentId?: string;
  // Daily limits for this deck.
  newPerDay: number;
  reviewsPerDay: number;
  // Algorithm settings.
  algorithm: "fsrs" | "sm2";
  desiredRetention: number; // 0.7..0.99, default 0.9
  // Learning steps in minutes for new + relearning cards.
  learningStepsMin: number[];      // e.g. [1, 10]
  relearningStepsMin: number[];    // e.g. [10]
  // Leech detection: card with >= leechThreshold lapses gets flagged.
  leechThreshold: number;
  createdAt: number;
};

export type ReviewLog = {
  id: string;
  cardId: string;
  grade: Grade;
  state: CardState;     // state BEFORE this review
  reviewedAt: number;
  intervalDays: number; // interval scheduled by this review
  elapsedDays: number;  // days since last review
  durationMs: number;   // user reaction time
};

export type StudyState = {
  cardsLeft: { newCount: number; learningCount: number; reviewCount: number };
};
