import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  booksCol,
  chaptersCol,
  toId,
  truthCol,
  type SwBook,
  type SwChapter,
  type SwTruthFile,
} from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function _handler_POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { newTitle?: string; copyChapters?: boolean } = {};
  try {
    body = await request.json();
  } catch {}
  const newTitle = (body.newTitle ?? "").trim();
  const copyChapters = body.copyChapters !== false;

  const bookId = toId(id);
  const book = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const now = new Date();
  const cloned: SwBook = {
    ...book,
    title: newTitle || `${book.title} (clone)`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  delete (cloned as { _id?: unknown })._id;
  cloned.aiTellHistory = [];
  cloned.wordCountHistory = [];

  const insertedBook = await (await booksCol()).insertOne(cloned);
  const newBookId = insertedBook.insertedId;

  // Clone truth files.
  const truthDocs = await (await truthCol()).find({ bookId, userId }).toArray();
  if (truthDocs.length) {
    const newTruth = truthDocs.map((doc): Omit<SwTruthFile, "_id"> => ({
      bookId: newBookId,
      userId,
      kind: doc.kind,
      content: doc.content,
      version: 1,
      updatedAt: now,
    }));
    await (await truthCol()).insertMany(newTruth);
  }

  let chaptersCloned = 0;
  if (copyChapters) {
    const chapters = await (await chaptersCol()).find({ bookId, userId }).sort({ number: 1 }).toArray();
    if (chapters.length) {
      const newChapters = chapters.map((ch): Omit<SwChapter, "_id"> => {
        const c = { ...ch } as SwChapter & { _id?: unknown };
        delete c._id;
        return {
          ...c,
          bookId: newBookId,
          createdAt: now,
          updatedAt: now,
          snapshots: [],
        };
      });
      await (await chaptersCol()).insertMany(newChapters);
      chaptersCloned = newChapters.length;
    }
  }

  return NextResponse.json({
    id: String(newBookId),
    title: cloned.title,
    chaptersCloned,
  });
}

export const POST = safeJsonRoute(_handler_POST);
