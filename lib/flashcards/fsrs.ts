// FSRS-6 spaced repetition algorithm — port of the open-source FSRS scheduler.
//
// State per card: stability S (days), difficulty D (1..10).
// On each review with grade g ∈ {1,2,3,4}:
//   1. Compute retrievability R from elapsed time and current S.
//   2. Update D and S using the FSRS-6 formulas.
//   3. Sample next interval = S × log_factor / (R^(1/desiredRetention) - 1) approximation,
//      simplified to the standard "next interval = stability × ln(retention) / ln(0.9)".
//
// Reference: FSRS algorithm v6 by Jarrett Ye et al, https://github.com/open-spaced-repetition/fsrs4anki
// We use the default-trained weights — good enough for general-purpose flashcards.
// Users can re-train weights from their review log later (Phase 2).

import type { Card, CardState, Grade } from "./types";

// 19-parameter weight vector (FSRS-6 defaults trained on the public review-log dataset).
const W: ReadonlyArray<number> = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544,
  1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
];

const FACTOR = 0.9; // 90% target retention floor.
const DECAY = -0.5;

function clampDifficulty(d: number): number {
  if (d < 1) return 1;
  if (d > 10) return 10;
  return d;
}

function clampStability(s: number): number {
  return Math.max(s, 0.001);
}

/** Retrievability after `elapsed` days given stability `s`. */
export function retrievability(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + FACTOR * (elapsedDays / stability), DECAY);
}

/** Initial difficulty for a freshly graded new card. */
function initialDifficulty(grade: Grade): number {
  return clampDifficulty(W[4] - Math.exp(W[5] * (grade - 1)) + 1);
}

/** Initial stability for a new card. */
function initialStability(grade: Grade): number {
  return clampStability(W[grade - 1]);
}

/** Update difficulty after a review. */
function nextDifficulty(d: number, grade: Grade): number {
  const dPrime = d - W[6] * (grade - 3);
  // Mean-reversion to initialDifficulty(g=4) at rate W[7].
  const target = initialDifficulty(4);
  const dNext = W[7] * target + (1 - W[7]) * dPrime;
  return clampDifficulty(dNext);
}

/** Stability after a successful review (grade ≥ 2). */
function stabilitySuccess(d: number, s: number, r: number, grade: Grade): number {
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const factor =
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return clampStability(s * (1 + factor));
}

/** Stability after a lapse (grade = 1). */
function stabilityFailure(d: number, s: number, r: number): number {
  const sf =
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp(W[14] * (1 - r));
  return clampStability(Math.min(sf, s));
}

/** Convert stability + desired retention into days until the next review. */
export function intervalDays(stability: number, desiredRetention: number): number {
  if (stability <= 0) return 1;
  // Inverse of retrievability formula: solve r = (1 + 0.9 * t/s)^-0.5 for t.
  const t = (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(t));
}

export type ScheduleResult = {
  card: Card;
  intervalDays: number;
};

/**
 * Apply a review to a card and return the updated card + scheduling info.
 *
 * Learning-state cards walk through `learningStepsMin` (and `relearningStepsMin`
 * when re-entering after a lapse). Once they graduate, they enter the "review"
 * state and are scheduled by FSRS proper.
 */
export function applyReview(
  card: Card,
  grade: Grade,
  now: number,
  options: {
    desiredRetention: number;
    learningStepsMin: number[];
    relearningStepsMin: number[];
    leechThreshold: number;
  },
): ScheduleResult {
  const elapsedMs = card.lastReviewAt ? now - card.lastReviewAt : 0;
  const elapsedDays = Math.max(0, elapsedMs / 86_400_000);

  // === New card → enter learning ===
  if (card.state === "new") {
    const updated: Card = {
      ...card,
      state: "learning",
      step: 0,
      stability: initialStability(grade),
      difficulty: initialDifficulty(grade),
      reps: card.reps,
      lastReviewAt: now,
      nextDueAt: now + (options.learningStepsMin[0] ?? 1) * 60_000,
    };
    if (grade === 4) {
      // Easy on first review → graduate immediately.
      const interval = intervalDays(updated.stability, options.desiredRetention);
      return graduate(updated, now, interval);
    }
    if (grade === 1) {
      updated.step = 0;
      updated.nextDueAt = now + (options.learningStepsMin[0] ?? 1) * 60_000;
      return { card: updated, intervalDays: 0 };
    }
    // Hard / Good → advance step
    if (grade >= 2) {
      const stepsLeft = options.learningStepsMin.length - 1;
      if (stepsLeft <= 0 || grade === 3 && updated.step >= options.learningStepsMin.length - 1) {
        const interval = intervalDays(updated.stability, options.desiredRetention);
        return graduate(updated, now, interval);
      }
      updated.step = Math.min(updated.step + 1, options.learningStepsMin.length - 1);
      updated.nextDueAt = now + (options.learningStepsMin[updated.step] ?? 1) * 60_000;
    }
    return { card: updated, intervalDays: 0 };
  }

  // === Learning / relearning → still walking through steps ===
  if (card.state === "learning" || card.state === "relearning") {
    const steps = card.state === "relearning" ? options.relearningStepsMin : options.learningStepsMin;
    const updated: Card = {
      ...card,
      lastReviewAt: now,
      reps: card.reps,
    };
    if (grade === 1) {
      updated.step = 0;
      updated.nextDueAt = now + (steps[0] ?? 1) * 60_000;
      return { card: updated, intervalDays: 0 };
    }
    if (grade === 4) {
      // Easy → graduate now.
      updated.stability = Math.max(card.stability, 1);
      const interval = intervalDays(updated.stability, options.desiredRetention);
      return graduate(updated, now, interval);
    }
    // Hard or Good
    const lastStep = steps.length - 1;
    if (updated.step >= lastStep || grade === 3) {
      const interval = intervalDays(Math.max(updated.stability, 1), options.desiredRetention);
      return graduate(updated, now, interval);
    }
    updated.step = Math.min(updated.step + 1, lastStep);
    updated.nextDueAt = now + (steps[updated.step] ?? 1) * 60_000;
    return { card: updated, intervalDays: 0 };
  }

  // === Review state → FSRS ===
  const r = retrievability(elapsedDays, card.stability);
  const dNext = nextDifficulty(card.difficulty, grade);
  let sNext: number;
  if (grade === 1) {
    sNext = stabilityFailure(card.difficulty, card.stability, r);
  } else {
    sNext = stabilitySuccess(card.difficulty, card.stability, r, grade);
  }

  if (grade === 1) {
    // Lapse → back to relearning queue.
    const lapses = card.lapses + 1;
    const updated: Card = {
      ...card,
      difficulty: dNext,
      stability: sNext,
      state: "relearning",
      step: 0,
      reps: card.reps,
      lapses,
      lastReviewAt: now,
      nextDueAt: now + (options.relearningStepsMin[0] ?? 10) * 60_000,
      leech: card.leech || lapses >= options.leechThreshold,
    };
    return { card: updated, intervalDays: 0 };
  }

  const interval = intervalDays(sNext, options.desiredRetention);
  const updated: Card = {
    ...card,
    state: "review",
    step: 0,
    difficulty: dNext,
    stability: sNext,
    reps: card.reps + 1,
    lastReviewAt: now,
    nextDueAt: now + interval * 86_400_000,
  };
  return { card: updated, intervalDays: interval };
}

function graduate(card: Card, now: number, interval: number): ScheduleResult {
  return {
    card: {
      ...card,
      state: "review",
      step: 0,
      reps: card.reps + 1,
      stability: Math.max(card.stability, interval),
      lastReviewAt: now,
      nextDueAt: now + interval * 86_400_000,
    },
    intervalDays: interval,
  };
}

/** Format the next-interval preview shown above each grade button. */
export function formatInterval(days: number): string {
  if (days < 1) return "<1m";
  if (days < 1 / 24) return `${Math.round(days * 1440)}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/**
 * Preview what the schedule would look like for each grade — used to render
 * the small "1m / 10m / 4d / 12d" labels above the four grade buttons.
 */
export function previewIntervals(
  card: Card,
  options: {
    desiredRetention: number;
    learningStepsMin: number[];
    relearningStepsMin: number[];
    leechThreshold: number;
  },
  now: number,
): Record<Grade, number> {
  const result: Record<Grade, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  ([1, 2, 3, 4] as Grade[]).forEach((g) => {
    const r = applyReview(card, g, now, options);
    if (r.intervalDays > 0) {
      result[g] = r.intervalDays;
    } else {
      // Convert milliseconds-from-now to fractional days for the preview.
      result[g] = Math.max(0, (r.card.nextDueAt - now) / 86_400_000);
    }
  });
  return result;
}

/** Build a fresh card row for a brand-new note. */
export function newCard(noteId: string, deckId: string, now: number): Card {
  return {
    id: cryptoRandomId(),
    noteId,
    deckId,
    state: "new" as CardState,
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    step: 0,
    nextDueAt: now,
  };
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
