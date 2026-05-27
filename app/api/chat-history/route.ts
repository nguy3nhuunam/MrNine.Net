import { NextResponse } from "next/server";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import {
  getCollection,
  getSessionUserId,
  type ChatHistoryDoc,
  type ChatMessage,
} from "@/lib/user-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_MESSAGES = 60;

async function _handler_GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ messages: [] });

  const collection = await getCollection<ChatHistoryDoc>("chats");
  if (!collection) return NextResponse.json({ messages: [] });

  const doc = await collection.findOne({ userId });
  return NextResponse.json({ messages: doc?.messages ?? [] });
}

async function _handler_PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const messages = Array.isArray((body as { messages?: unknown } | null)?.messages)
    ? (body as { messages: unknown[] }).messages
        .filter((entry): entry is ChatMessage => {
          if (!entry || typeof entry !== "object") return false;
          const candidate = entry as Record<string, unknown>;
          return (
            (candidate.role === "user" || candidate.role === "assistant") &&
            typeof candidate.content === "string" &&
            (candidate.content as string).length > 0
          );
        })
        .slice(-MAX_MESSAGES)
    : [];

  const collection = await getCollection<ChatHistoryDoc>("chats");
  if (!collection) return NextResponse.json({ ok: false }, { status: 500 });

  await collection.updateOne(
    { userId },
    { $set: { messages, updatedAt: new Date() } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true, count: messages.length });
}

async function _handler_DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const collection = await getCollection<ChatHistoryDoc>("chats");
  if (!collection) return NextResponse.json({ ok: false });
  await collection.deleteOne({ userId });
  return NextResponse.json({ ok: true });
}

export const GET = rateLimitedRoute("chat-history", _handler_GET);
export const PUT = rateLimitedRoute("chat-history", _handler_PUT);
export const DELETE = rateLimitedRoute("chat-history", _handler_DELETE);
