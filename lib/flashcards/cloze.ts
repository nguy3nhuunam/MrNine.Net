// Cloze deletion parser.
//
// Anki syntax: {{c1::answer}} or {{c1::answer::hint}}
// Multiple cloze indices in one note produce multiple cards (c1 → card 1,
// c2 → card 2, etc). For Phase 1 we render whichever cloze index the card
// is targeting; the rest stay revealed. This matches Anki's "Cloze" template.

export type ClozeRender =
  | { kind: "text"; text: string }
  | { kind: "blank"; hint?: string }
  | { kind: "answer"; text: string };

export type ClozeParseResult = {
  /** Highest cloze index found, e.g. 3 for {{c1::}}{{c3::}}. */
  maxIndex: number;
  /** All distinct indices, sorted ascending. */
  indices: number[];
  /** Plain-text version with all answers revealed (for browsing). */
  plain: string;
};

const CLOZE_RE = /\{\{c(\d+)::((?:[^{}]|\{[^{]|\}[^}])+?)(?:::([^{}]+))?\}\}/g;

export function parseCloze(source: string): ClozeParseResult {
  const indices = new Set<number>();
  let max = 0;
  let plain = "";
  let last = 0;
  for (const m of source.matchAll(CLOZE_RE)) {
    const idx = parseInt(m[1], 10);
    indices.add(idx);
    if (idx > max) max = idx;
    plain += source.slice(last, m.index);
    plain += m[2];
    last = m.index! + m[0].length;
  }
  plain += source.slice(last);
  return {
    maxIndex: max,
    indices: [...indices].sort((a, b) => a - b),
    plain,
  };
}

/**
 * Render the source for a specific cloze card.
 *
 * `targetIndex` decides which cloze appears blanked:
 * - That index → blank (with optional hint).
 * - Other indices → answer text revealed.
 * - Plain text outside cloze markers passes through.
 */
export function renderCloze(source: string, targetIndex: number): ClozeRender[] {
  const out: ClozeRender[] = [];
  let last = 0;
  for (const m of source.matchAll(CLOZE_RE)) {
    if (m.index! > last) {
      out.push({ kind: "text", text: source.slice(last, m.index) });
    }
    const idx = parseInt(m[1], 10);
    const answer = m[2];
    const hint = m[3];
    if (idx === targetIndex) {
      out.push({ kind: "blank", hint });
    } else {
      out.push({ kind: "answer", text: answer });
    }
    last = m.index! + m[0].length;
  }
  if (last < source.length) {
    out.push({ kind: "text", text: source.slice(last) });
  }
  return out;
}

/** Render the answer side of a cloze card — the target shows the answer. */
export function renderClozeAnswer(source: string, targetIndex: number): ClozeRender[] {
  return renderCloze(source, targetIndex).map((part): ClozeRender => {
    if (part.kind === "answer") return { kind: "text", text: part.text };
    return part;
  });
}

/**
 * Strip cloze markers entirely → useful for previews + search indexing.
 */
export function clozeToPlain(source: string): string {
  return source.replace(CLOZE_RE, (_, _idx, answer) => answer);
}

/**
 * The first answer for a given cloze index — used to grade typed answers
 * on cloze cards.
 */
export function firstAnswerForIndex(source: string, idx: number): string | null {
  for (const m of source.matchAll(CLOZE_RE)) {
    if (parseInt(m[1], 10) === idx) {
      return m[2];
    }
  }
  return null;
}
