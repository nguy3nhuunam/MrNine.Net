import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, toId, truthCol, TRUTH_KINDS, type TruthKind } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;
  const bookId = toId(id);
  const book = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const docs = await (await truthCol()).find({ bookId, userId }).toArray();
  const map: Record<string, { content: string; version: number; updatedAt: Date } | null> = {};
  for (const kind of TRUTH_KINDS) {
    const found = docs.find((d) => d.kind === kind);
    map[kind] = found
      ? { content: found.content, version: found.version, updatedAt: found.updatedAt }
      : null;
  }
  return NextResponse.json({ truth: map });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { kind?: string; content?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const kind = body.kind as TruthKind | undefined;
  if (!kind || !TRUTH_KINDS.includes(kind)) {
    return NextResponse.json({ error: "kind không hợp lệ" }, { status: 400 });
  }
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content phải là chuỗi" }, { status: 400 });
  }
  const bookId = toId(id);
  const owned = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!owned) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const truth = await truthCol();
  const now = new Date();
  const updated = await truth.findOneAndUpdate(
    { bookId, userId, kind },
    {
      $set: { content: body.content, updatedAt: now },
      $inc: { version: 1 },
    },
    { returnDocument: "after", upsert: true },
  );
  return NextResponse.json({
    kind,
    content: updated?.content ?? body.content,
    version: updated?.version ?? 1,
    updatedAt: updated?.updatedAt ?? now,
  });
}
