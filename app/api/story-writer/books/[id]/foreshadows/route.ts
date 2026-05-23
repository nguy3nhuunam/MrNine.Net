import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, toId, type SwForeshadow } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const STATUS_VALUES: SwForeshadow["status"][] = ["open", "progressing", "deferred", "resolved"];

function nextId(existing: ReadonlyArray<{ id: string }>): string {
  const max = existing
    .map((item) => Number.parseInt(item.id.replace(/[^\d]/g, ""), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `f${max + 1}`;
}

export async function GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const book = await (await booksCol()).findOne({ _id: toId(id), userId: session.user.id });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });
  return NextResponse.json({ foreshadows: book.foreshadows ?? [] });
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { op: string; targetId?: string; payload?: Partial<SwForeshadow> } = { op: "" };
  try {
    body = await request.json();
  } catch {}

  const bookId = toId(id);
  const col = await booksCol();
  const book = await col.findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const foreshadows = [...(book.foreshadows ?? [])];

  if (body.op === "add") {
    const p = body.payload ?? {};
    if (!p.summary) return NextResponse.json({ error: "Thiếu summary" }, { status: 400 });
    foreshadows.push({
      id: nextId(foreshadows),
      summary: String(p.summary).slice(0, 500),
      status: STATUS_VALUES.includes(p.status as SwForeshadow["status"])
        ? (p.status as SwForeshadow["status"])
        : "open",
      reoIntroducedAtChapter: typeof p.reoIntroducedAtChapter === "number" ? p.reoIntroducedAtChapter : undefined,
      lastAdvancedChapter: typeof p.lastAdvancedChapter === "number" ? p.lastAdvancedChapter : undefined,
      expectedResolutionChapter:
        typeof p.expectedResolutionChapter === "number" ? p.expectedResolutionChapter : undefined,
    });
  } else if (body.op === "update") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const idx = foreshadows.findIndex((f) => f.id === body.targetId);
    if (idx < 0) return NextResponse.json({ error: "Không tìm thấy foreshadow" }, { status: 404 });
    const p = body.payload ?? {};
    foreshadows[idx] = {
      ...foreshadows[idx],
      summary: typeof p.summary === "string" ? p.summary.slice(0, 500) : foreshadows[idx].summary,
      status: STATUS_VALUES.includes(p.status as SwForeshadow["status"])
        ? (p.status as SwForeshadow["status"])
        : foreshadows[idx].status,
      reoIntroducedAtChapter:
        typeof p.reoIntroducedAtChapter === "number" ? p.reoIntroducedAtChapter : foreshadows[idx].reoIntroducedAtChapter,
      lastAdvancedChapter:
        typeof p.lastAdvancedChapter === "number" ? p.lastAdvancedChapter : foreshadows[idx].lastAdvancedChapter,
      expectedResolutionChapter:
        typeof p.expectedResolutionChapter === "number"
          ? p.expectedResolutionChapter
          : foreshadows[idx].expectedResolutionChapter,
    };
  } else if (body.op === "delete") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const remaining = foreshadows.filter((f) => f.id !== body.targetId);
    foreshadows.length = 0;
    foreshadows.push(...remaining);
  } else {
    return NextResponse.json({ error: "op không hợp lệ" }, { status: 400 });
  }

  await col.updateOne(
    { _id: bookId, userId },
    { $set: { foreshadows, updatedAt: new Date() } },
  );
  return NextResponse.json({ foreshadows });
}
