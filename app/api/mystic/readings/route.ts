import { NextResponse } from "next/server";
import { safeJsonRoute } from "@/lib/safe-json-route";
import {
  getCollection,
  getSessionUserId,
  type MysticReadingDoc,
} from "@/lib/user-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_READINGS = 50;

async function _handler_GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ readings: [] });
  const collection = await getCollection<MysticReadingDoc>("mysticReadings");
  if (!collection) return NextResponse.json({ readings: [] });
  const docs = await collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(MAX_READINGS)
    .toArray();
  return NextResponse.json({ readings: docs });
}

async function _handler_POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | Partial<Omit<MysticReadingDoc, "userId" | "createdAt">>
    | null;
  if (!body?.readingId || !body.kind) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (body.kind !== "ziwei" && body.kind !== "tarot" && body.kind !== "numerology") {
    return NextResponse.json({ error: "bad kind" }, { status: 400 });
  }
  const collection = await getCollection<MysticReadingDoc>("mysticReadings");
  if (!collection) return NextResponse.json({ ok: false }, { status: 500 });
  const doc: MysticReadingDoc = {
    userId,
    readingId: String(body.readingId),
    kind: body.kind,
    summary: String(body.summary ?? ""),
    payload: body.payload,
    aiReading: body.aiReading,
    createdAt: new Date(),
  };
  await collection.updateOne(
    { userId, readingId: doc.readingId },
    { $set: doc },
    { upsert: true },
  );
  const count = await collection.countDocuments({ userId });
  if (count > MAX_READINGS) {
    const overflow = await collection
      .find({ userId })
      .sort({ createdAt: 1 })
      .limit(count - MAX_READINGS)
      .toArray();
    if (overflow.length > 0) {
      await collection.deleteMany({
        userId,
        readingId: { $in: overflow.map((entry) => entry.readingId) },
      });
    }
  }
  return NextResponse.json({ ok: true });
}

async function _handler_DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const url = new URL(request.url);
  const readingId = url.searchParams.get("readingId");
  const collection = await getCollection<MysticReadingDoc>("mysticReadings");
  if (!collection) return NextResponse.json({ ok: false });
  if (readingId) {
    await collection.deleteOne({ userId, readingId });
  } else {
    await collection.deleteMany({ userId });
  }
  return NextResponse.json({ ok: true });
}

export const GET = safeJsonRoute(_handler_GET);
export const POST = safeJsonRoute(_handler_POST);
export const DELETE = safeJsonRoute(_handler_DELETE);
