// Shared helpers for per-user persistent state stored in MongoDB.
// Each helper returns the active session user's id, or null if there is
// no signed-in user. Routes that wrap data in these helpers should fall
// back to a 401 when no user is present.

import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import type { Collection, Db } from "mongodb";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getDb(): Promise<Db | null> {
  if (!clientPromise) return null;
  const client = await clientPromise;
  return client.db();
}

export async function getCollection<T extends { _id?: unknown }>(name: string): Promise<Collection<T> | null> {
  const db = await getDb();
  if (!db) return null;
  return db.collection<T>(name);
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatHistoryDoc = {
  _id?: string;
  userId: string;
  messages: ChatMessage[];
  updatedAt: Date;
};

export type PlaygroundAssetDoc = {
  _id?: string;
  userId: string;
  assetId: string;
  url: string;
  kind: "image" | "video";
  modelId: string;
  modelLabel: string;
  prompt: string;
  params?: Record<string, unknown>;
  createdAt: Date;
};

export type MysticReadingDoc = {
  _id?: string;
  userId: string;
  readingId: string;
  kind: "ziwei" | "tarot" | "numerology";
  summary: string;
  payload: unknown;
  aiReading?: string;
  createdAt: Date;
};
