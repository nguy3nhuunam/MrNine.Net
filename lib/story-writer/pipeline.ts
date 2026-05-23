// Pipeline orchestrator helpers — load truth files, recent summaries, etc.

import {
  booksCol,
  chaptersCol,
  truthCol,
  TRUTH_KINDS,
  type SwBook,
  type SwTruthFile,
  type TruthKind,
} from "@/lib/story-writer/store";
import type { TruthDelta } from "@/lib/story-writer/agents";
import type { ObjectId } from "mongodb";

export async function loadBookForUser(bookId: ObjectId, userId: string): Promise<SwBook | null> {
  return (await booksCol()).findOne({ _id: bookId, userId });
}

export async function loadTruthMap(
  bookId: ObjectId,
  userId: string,
): Promise<Record<TruthKind, SwTruthFile | undefined>> {
  const docs = await (await truthCol()).find({ bookId, userId }).toArray();
  const map: Record<TruthKind, SwTruthFile | undefined> = {} as Record<TruthKind, SwTruthFile | undefined>;
  for (const kind of TRUTH_KINDS) {
    map[kind] = docs.find((d) => d.kind === kind);
  }
  return map;
}

export async function loadRecentSummaries(
  bookId: ObjectId,
  userId: string,
  beforeChapter: number,
  count = 3,
): Promise<string> {
  const list = await (await chaptersCol())
    .find({ bookId, userId, number: { $lt: beforeChapter }, status: "approved" })
    .sort({ number: -1 })
    .limit(count)
    .toArray();
  if (!list.length) return "";
  return list
    .reverse()
    .map((ch) => `### Chương ${ch.number}: ${ch.title}\n${(ch.finalText ?? ch.draft ?? "").slice(0, 500)}`)
    .join("\n\n");
}

export async function applyTruthDelta(
  bookId: ObjectId,
  userId: string,
  delta: TruthDelta,
): Promise<void> {
  const truth = await truthCol();
  const now = new Date();
  for (const kind of TRUTH_KINDS) {
    const value = delta[kind];
    if (typeof value === "string" && value.trim()) {
      await truth.findOneAndUpdate(
        { bookId, userId, kind },
        { $set: { content: value, updatedAt: now }, $inc: { version: 1 } },
        { upsert: true },
      );
    }
  }
  if (delta.chapterSummaryAppend) {
    const found = await truth.findOne({ bookId, userId, kind: "chapter_summaries" });
    const current = found?.content ?? "## Chapter Summaries\n";
    const next = `${current.trimEnd()}\n\n${delta.chapterSummaryAppend.trim()}\n`;
    await truth.findOneAndUpdate(
      { bookId, userId, kind: "chapter_summaries" },
      { $set: { content: next, updatedAt: now }, $inc: { version: 1 } },
      { upsert: true },
    );
  }
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
