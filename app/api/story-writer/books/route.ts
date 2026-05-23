import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runArchitect } from "@/lib/story-writer/architect";
import { getGenre } from "@/lib/story-writer/genres";
import {
  booksCol,
  projectsCol,
  toId,
  truthCol,
  type LlmConfig,
  type SwBook,
  type TruthKind,
  TRUTH_KINDS,
} from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
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

export async function POST(request: Request) {
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

  const authorIntent = (body.authorIntent ?? "").trim();
  const currentFocus = (body.currentFocus ?? "").trim();
  const brief = (body.brief ?? "").trim();

  let architectResult;
  try {
    architectResult = await runArchitect({
      title,
      genreId: genre,
      brief,
      authorIntent,
      currentFocus,
      chapterWords,
      targetChapters,
      llm: body.llm ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Architect thất bại" },
      { status: 502 },
    );
  }

  const now = new Date();
  // Persist Architect output as structured entities.
  const charById = new Map<string, string>();
  const characters = (architectResult.characters ?? []).map((c, idx) => {
    const id = `c${idx + 1}`;
    charById.set(c.name.trim().toLowerCase(), id);
    return {
      id,
      name: c.name.trim(),
      role: c.role,
      profile: c.profile,
      aliases: c.aliases ?? [],
    };
  });
  const relationships = (architectResult.relationships ?? [])
    .map((rel, idx) => {
      const fromId = charById.get(rel.fromName?.trim?.().toLowerCase?.() ?? "");
      const toId = charById.get(rel.toName?.trim?.().toLowerCase?.() ?? "");
      if (!fromId || !toId) return null;
      const safeKind = [
        "knows",
        "loves",
        "hates",
        "rivals",
        "parent_of",
        "child_of",
        "sibling",
        "mentor_of",
        "ally",
        "owes",
        "secret_with",
        "betrayed_by",
        "custom",
      ].includes(rel.kind)
        ? (rel.kind as
            | "knows"
            | "loves"
            | "hates"
            | "rivals"
            | "parent_of"
            | "child_of"
            | "sibling"
            | "mentor_of"
            | "ally"
            | "owes"
            | "secret_with"
            | "betrayed_by"
            | "custom")
        : "custom";
      return {
        id: `r${idx + 1}`,
        fromCharacterId: fromId,
        toCharacterId: toId,
        kind: safeKind,
        label: rel.label,
        note: rel.note,
      };
    })
    .filter((rel): rel is NonNullable<typeof rel> => rel !== null);
  const foreshadows = (architectResult.foreshadows ?? []).map((f, idx) => ({
    id: `f${idx + 1}`,
    summary: f.summary,
    status: "open" as const,
    expectedResolutionChapter: f.expectedResolutionChapter,
  }));
  const volumes = (architectResult.volumes ?? []).map((v) => ({
    id: `v${v.number}`,
    number: v.number,
    title: v.title,
    summary: v.summary,
    startChapter: v.startChapter,
    endChapter: v.endChapter,
    status: "planned" as const,
  }));

  const book: SwBook = {
    projectId: toId(projectId),
    userId,
    title,
    genre,
    platform: genreSpec.platform,
    chapterWords,
    targetChapters,
    status: "draft",
    brief: brief || undefined,
    authorIntent,
    currentFocus,
    bookRules: architectResult.bookRules,
    storyBible: architectResult.storyBible,
    volumeOutline: architectResult.volumeOutline,
    styleGuide: genreSpec.styleGuide,
    llm: body.llm ?? undefined,
    characters,
    relationships,
    foreshadows,
    volumes,
    aiTellHistory: [],
    wordCountHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await (await booksCol()).insertOne(book);
  const bookId = insertResult.insertedId;

  // Seed 7 truth files.
  const truth = await truthCol();
  const truthDocs = TRUTH_KINDS.map((kind: TruthKind) => ({
    bookId,
    userId,
    kind,
    content: architectResult.truthSeeds[kind] ?? "",
    version: 1,
    updatedAt: now,
  }));
  await truth.insertMany(truthDocs);

  await (await projectsCol()).updateOne({ _id: toId(projectId), userId }, { $set: { updatedAt: now } });

  return NextResponse.json({
    id: String(bookId),
    title,
    genre,
    status: "draft",
    storyBible: architectResult.storyBible,
    bookRules: architectResult.bookRules,
    volumeOutline: architectResult.volumeOutline,
    characters: architectResult.characters,
  });
}
