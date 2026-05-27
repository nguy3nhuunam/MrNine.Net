import { NextResponse } from "next/server";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import {
  getCollection,
  getSessionUserId,
  type PlaygroundAssetDoc,
} from "@/lib/user-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ASSETS = 80;

async function _handler_GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ assets: [] });
  const collection = await getCollection<PlaygroundAssetDoc>("playgroundAssets");
  if (!collection) return NextResponse.json({ assets: [] });
  const docs = await collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(MAX_ASSETS)
    .toArray();
  return NextResponse.json({ assets: docs });
}

async function _handler_POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | Partial<Omit<PlaygroundAssetDoc, "userId" | "createdAt">>
    | null;
  if (!body?.assetId || !body.url || !body.modelId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const collection = await getCollection<PlaygroundAssetDoc>("playgroundAssets");
  if (!collection) return NextResponse.json({ ok: false }, { status: 500 });
  const doc: PlaygroundAssetDoc = {
    userId,
    assetId: String(body.assetId),
    url: String(body.url),
    kind: body.kind === "video" ? "video" : "image",
    modelId: String(body.modelId),
    modelLabel: String(body.modelLabel ?? body.modelId),
    prompt: String(body.prompt ?? ""),
    params: body.params,
    createdAt: new Date(),
  };
  await collection.updateOne(
    { userId, assetId: doc.assetId },
    { $set: doc },
    { upsert: true },
  );
  // trim
  const count = await collection.countDocuments({ userId });
  if (count > MAX_ASSETS) {
    const overflow = await collection
      .find({ userId })
      .sort({ createdAt: 1 })
      .limit(count - MAX_ASSETS)
      .toArray();
    if (overflow.length > 0) {
      await collection.deleteMany({
        userId,
        assetId: { $in: overflow.map((entry) => entry.assetId) },
      });
    }
  }
  return NextResponse.json({ ok: true });
}

async function _handler_DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });
  const url = new URL(request.url);
  const assetId = url.searchParams.get("assetId");
  const collection = await getCollection<PlaygroundAssetDoc>("playgroundAssets");
  if (!collection) return NextResponse.json({ ok: false });
  if (assetId) {
    await collection.deleteOne({ userId, assetId });
  } else {
    await collection.deleteMany({ userId });
  }
  return NextResponse.json({ ok: true });
}

export const GET = rateLimitedRoute("playground-assets", _handler_GET);
export const POST = rateLimitedRoute("playground-assets", _handler_POST);
export const DELETE = rateLimitedRoute("playground-assets", _handler_DELETE);
