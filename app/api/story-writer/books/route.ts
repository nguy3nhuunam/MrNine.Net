import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGenre } from "@/lib/story-writer/genres";
import {
  booksCol,
  projectsCol,
  toId,
  truthCol,
  type LlmConfig,
  type SwBook,
  TRUTH_KINDS,
} from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

async function _handler_GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const filter: Record<string, unknown> = { userId: session.user.id };
  if (projectId) filter.projectId = toId(projectId);
  const list = await (await booksCol()).find(filter).sort({ updatedAt: -1 }).limit(80).toArray();
  return NextResponse.json({
    books: list.map((b) => ({
      id: String(b._id),
      projectId: String(b.projectId),
      title: b.title,
      genre: b.genre,
      status: b.status,
      chapterWords: b.chapterWords,
      targetChapters: b.targetChapters,
      updatedAt: b.updatedAt,
    })),
  });
}

// Stub-only book creation. Returns instantly so the UI never hits the
// 60s function timeout. The skeleton + truth seeds are produced by the
// follow-up POST /books/[id]/architect-rerun call (split into two LLM
// passes) which the client triggers right after.
async function _handler_POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const userId = session.user.id;

  let body: {
    projectId?: string;
    title?: string;
    genre?: string;
    brief?: string;
    authorIntent?: string;
    currentFocus?: string;
    chapterWords?: number;
    targetChapters?: number;
    llm?: LlmConfig;
  } = {};
  try {
    body = await request.json();
  } catch {}

  const title = (body.title ?? "").trim();
  const genre = (body.genre ?? "").trim();
  const projectId = (body.projectId ?? "").trim();
  if (!title || !genre || !projectId) {
    return NextResponse.json({ error: "Thiếu projectId / title / genre" }, { status: 400 });
  }
  const genreSpec = getGenre(genre);
  if (!genreSpec) return NextResponse.json({ error: "Genre không hỗ trợ" }, { status: 400 });

  const project = await (await projectsCol()).findOne({ _id: toId(projectId), userId });
  if (!project) return NextResponse.json({ error: "Dự án không tồn tại" }, { status: 404 });

  const chapterWords = Number.isFinite(body.chapterWords) && Number(body.chapterWords) > 0
    ? Math.min(8000, Math.max(800, Number(body.chapterWords)))
    : genreSpec.defaultChapterWords;
  const targetChapters = Number.isFinite(body.targetChapters) && Number(body.targetChapters) > 0
    ? Math.min(2000, Math.max(20, Number(body.targetChapters)))
    : genreSpec.defaultTargetChapters;

  const now = new Date();
  const book: SwBook = {
    projectId: toId(projectId),
    userId,
    title,
    genre,
    platform: genreSpec.platform,
    chapterWords,
    targetChapters,
    status: "draft",
    brief: (body.brief ?? "").trim() || undefined,
    authorIntent: (body.authorIntent ?? "").trim(),
    currentFocus: (body.currentFocus ?? "").trim(),
    bookRules: "",
    storyBible: "",
    volumeOutline: "",
    styleGuide: genreSpec.styleGuide,
    llm: body.llm ?? undefined,
    characters: [],
    relationships: [],
    foreshadows: [],
    volumes: [],
    aiTellHistory: [],
    wordCountHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await (await booksCol()).insertOne(book);
  const bookId = insertResult.insertedId;

  // Empty truth files; architect-rerun will fill them.
  const truthDocs = TRUTH_KINDS.map((kind) => ({
    bookId,
    userId,
    kind,
    content: "",
    version: 1,
    updatedAt: now,
  }));
  await (await truthCol()).insertMany(truthDocs);

  await (await projectsCol()).updateOne({ _id: toId(projectId), userId }, { $set: { updatedAt: now } });

  return NextResponse.json({
    id: String(bookId),
    title,
    genre,
    status: "draft",
    needsArchitect: true,
  });
}

export const GET = safeJsonRoute(_handler_GET);
export const POST = safeJsonRoute(_handler_POST);
