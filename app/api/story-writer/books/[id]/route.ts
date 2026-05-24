import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  booksCol,
  chaptersCol,
  memoryCol,
  toId,
  truthCol,
  type LlmConfig,
} from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function _handler_GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const book = await (await booksCol()).findOne({ _id: toId(id), userId: session.user.id });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });
  return NextResponse.json({
    id: String(book._id),
    projectId: String(book.projectId),
    title: book.title,
    genre: book.genre,
    platform: book.platform,
    chapterWords: book.chapterWords,
    targetChapters: book.targetChapters,
    status: book.status,
    brief: book.brief ?? "",
    authorIntent: book.authorIntent,
    currentFocus: book.currentFocus,
    bookRules: book.bookRules,
    storyBible: book.storyBible,
    volumeOutline: book.volumeOutline,
    styleFingerprint: book.styleFingerprint ?? null,
    styleGuide: book.styleGuide ?? "",
    characters: book.characters ?? [],
    relationships: book.relationships ?? [],
    foreshadows: book.foreshadows ?? [],
    volumes: book.volumes ?? [],
    llm: book.llm ?? null,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  });
}

async function _handler_PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: Partial<{
    title: string;
    authorIntent: string;
    currentFocus: string;
    bookRules: string;
    storyBible: string;
    volumeOutline: string;
    styleGuide: string;
    chapterWords: number;
    targetChapters: number;
    status: "draft" | "writing" | "paused" | "completed";
    llm: LlmConfig | null;
  }> = {};
  try {
    body = await request.json();
  } catch {}

  const update: Record<string, unknown> = { updatedAt: new Date() };
  const allowedString = [
    "title",
    "authorIntent",
    "currentFocus",
    "bookRules",
    "storyBible",
    "volumeOutline",
    "styleGuide",
  ] as const;
  for (const key of allowedString) {
    const value = body[key];
    if (typeof value === "string") update[key] = value;
  }
  if (typeof body.chapterWords === "number" && body.chapterWords > 0) {
    update.chapterWords = Math.min(8000, Math.max(800, body.chapterWords));
  }
  if (typeof body.targetChapters === "number" && body.targetChapters > 0) {
    update.targetChapters = Math.min(2000, Math.max(20, body.targetChapters));
  }
  if (typeof body.status === "string" && ["draft", "writing", "paused", "completed"].includes(body.status)) {
    update.status = body.status;
  }
  if (body.llm === null) {
    update.llm = null;
  } else if (body.llm && typeof body.llm === "object") {
    update.llm = body.llm;
  }

  const result = await (await booksCol()).findOneAndUpdate(
    { _id: toId(id), userId },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!result) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });
  return NextResponse.json({ id: String(result._id), updatedAt: result.updatedAt });
}

async function _handler_DELETE(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;
  const bookId = toId(id);
  const owned = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!owned) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  await Promise.all([
    (await truthCol()).deleteMany({ bookId, userId }),
    (await chaptersCol()).deleteMany({ bookId, userId }),
    (await memoryCol()).deleteMany({ bookId, userId }),
    (await booksCol()).deleteOne({ _id: bookId, userId }),
  ]);
  return NextResponse.json({ ok: true });
}

export const GET = safeJsonRoute(_handler_GET);

export const PATCH = safeJsonRoute(_handler_PATCH);

export const DELETE = safeJsonRoute(_handler_DELETE);
