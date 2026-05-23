// Story Writer storage layer — MongoDB collections + helpers.
// All documents are scoped to userId so users only see their own work.

import { ObjectId, type Collection, type Db } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DB_NAME = process.env.MONGODB_DB || "mrnine";

export type SwProject = {
  _id?: ObjectId;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LlmConfig = {
  provider: "yunwu" | "custom";
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

export type SwBook = {
  _id?: ObjectId;
  projectId: ObjectId;
  userId: string;
  title: string;
  genre: string;
  platform: string;
  chapterWords: number;
  targetChapters: number;
  status: "draft" | "writing" | "paused" | "completed";
  brief?: string;
  authorIntent: string;
  currentFocus: string;
  bookRules: string;
  storyBible: string;
  volumeOutline: string;
  styleFingerprint?: {
    avgSentenceLen: number;
    sentenceLenStdDev: number;
    topWords: Array<{ word: string; count: number }>;
    samplePassage: string;
  };
  styleGuide?: string;
  llm?: LlmConfig;
  characters?: Array<{
    name: string;
    role: string;
    profile: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export type TruthKind =
  | "current_state"
  | "particle_ledger"
  | "pending_hooks"
  | "chapter_summaries"
  | "subplot_board"
  | "emotional_arcs"
  | "character_matrix";

export const TRUTH_KINDS: ReadonlyArray<TruthKind> = [
  "current_state",
  "particle_ledger",
  "pending_hooks",
  "chapter_summaries",
  "subplot_board",
  "emotional_arcs",
  "character_matrix",
];

export type SwTruthFile = {
  _id?: ObjectId;
  bookId: ObjectId;
  userId: string;
  kind: TruthKind;
  content: string;
  version: number;
  updatedAt: Date;
};

export type ChapterStatus = "planned" | "drafted" | "audited" | "approved";

export type SwChapter = {
  _id?: ObjectId;
  bookId: ObjectId;
  userId: string;
  number: number;
  title: string;
  status: ChapterStatus;
  contextBrief?: string;
  intent?: string;
  context?: unknown;
  ruleStack?: string;
  trace?: unknown;
  draft?: string;
  finalText?: string;
  auditReport?: {
    overallScore: number;
    issues: Array<{
      dimension: string;
      severity: "low" | "medium" | "high";
      message: string;
      suggestion?: string;
    }>;
    aiTellRate?: number;
  };
  wordCount?: number;
  snapshots?: Array<{ at: Date; text: string; label?: string }>;
  createdAt: Date;
  updatedAt: Date;
};

export type SwMemory = {
  _id?: ObjectId;
  bookId: ObjectId;
  userId: string;
  kind: "fact" | "hook" | "summary";
  key: string;
  value: string;
  chapterNumber?: number;
  lastAccessedAt: Date;
};

async function getDb(): Promise<Db> {
  if (!clientPromise) {
    throw new Error("MongoDB chưa được cấu hình");
  }
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function projectsCol(): Promise<Collection<SwProject>> {
  const db = await getDb();
  return db.collection<SwProject>("sw_projects");
}

export async function booksCol(): Promise<Collection<SwBook>> {
  const db = await getDb();
  return db.collection<SwBook>("sw_books");
}

export async function truthCol(): Promise<Collection<SwTruthFile>> {
  const db = await getDb();
  return db.collection<SwTruthFile>("sw_truth");
}

export async function chaptersCol(): Promise<Collection<SwChapter>> {
  const db = await getDb();
  return db.collection<SwChapter>("sw_chapters");
}

export async function memoryCol(): Promise<Collection<SwMemory>> {
  const db = await getDb();
  return db.collection<SwMemory>("sw_memory");
}

export function toId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new Error("ID không hợp lệ");
  }
  return new ObjectId(value);
}

export function asBookOwner<T extends { userId: string }>(doc: T | null, userId: string): T | null {
  if (!doc) return null;
  return doc.userId === userId ? doc : null;
}
