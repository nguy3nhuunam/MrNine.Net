import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, chaptersCol, toId, type SwChapter } from "@/lib/story-writer/store";
import { rateLimitedRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function _handler_GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "Thiếu bookId" }, { status: 400 });

  const book = await (await booksCol()).findOne({ _id: toId(bookId), userId: session.user.id });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const list = await (await chaptersCol())
    .find({ bookId: toId(bookId), userId: session.user.id })
    .sort({ number: 1 })
    .limit(500)
    .toArray();

  return NextResponse.json({
    chapters: list.map((c) => ({
      id: String(c._id),
      number: c.number,
      title: c.title,
      status: c.status,
      wordCount: c.wordCount ?? 0,
      contextBrief: c.contextBrief ?? "",
      auditScore: c.auditReport?.overallScore ?? null,
      issuesCount: c.auditReport?.issues?.length ?? 0,
      updatedAt: c.updatedAt,
    })),
  });
}

async function _handler_POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });

  let body: { bookId?: string; number?: number; title?: string; contextBrief?: string } = {};
  try {
    body = await request.json();
  } catch {}

  if (!body.bookId) return NextResponse.json({ error: "Thiếu bookId" }, { status: 400 });
  const bookId = toId(body.bookId);
  const userId = session.user.id;
  const book = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const chapters = await chaptersCol();
  const last = await chapters.find({ bookId, userId }).sort({ number: -1 }).limit(1).next();
  const number = typeof body.number === "number" && body.number > 0 ? Math.floor(body.number) : (last?.number ?? 0) + 1;

  const exist = await chapters.findOne({ bookId, userId, number });
  if (exist) return NextResponse.json({ error: `Chương ${number} đã tồn tại` }, { status: 409 });

  const now = new Date();
  const doc: SwChapter = {
    bookId,
    userId,
    number,
    title: (body.title ?? `Chương ${number}`).slice(0, 200),
    status: "planned",
    contextBrief: (body.contextBrief ?? "").slice(0, 2000),
    snapshots: [],
    createdAt: now,
    updatedAt: now,
  };
  const inserted = await chapters.insertOne(doc);
  return NextResponse.json({ id: String(inserted.insertedId), number, title: doc.title, status: doc.status });
}

export const GET = rateLimitedRoute("story-writer-chapters", _handler_GET);

export const POST = rateLimitedRoute("story-writer-chapters", _handler_POST);
