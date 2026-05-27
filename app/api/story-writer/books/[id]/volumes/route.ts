import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, toId, type SwVolume } from "@/lib/story-writer/store";
import { rateLimitedRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const STATUS_VALUES: SwVolume["status"][] = ["planned", "writing", "completed"];

function nextId(existing: ReadonlyArray<{ id: string; number: number }>): { id: string; number: number } {
  const number = existing.length === 0 ? 1 : Math.max(...existing.map((v) => v.number)) + 1;
  return { id: `v${number}`, number };
}

async function _handler_GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const book = await (await booksCol()).findOne({ _id: toId(id), userId: session.user.id });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });
  return NextResponse.json({ volumes: book.volumes ?? [] });
}

async function _handler_POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { op: string; targetId?: string; payload?: Partial<SwVolume> } = { op: "" };
  try {
    body = await request.json();
  } catch {}

  const bookId = toId(id);
  const col = await booksCol();
  const book = await col.findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const volumes = [...(book.volumes ?? [])];

  if (body.op === "add") {
    const p = body.payload ?? {};
    if (!p.title || typeof p.startChapter !== "number") {
      return NextResponse.json({ error: "Thiếu title/startChapter" }, { status: 400 });
    }
    const next = nextId(volumes);
    volumes.push({
      id: next.id,
      number: next.number,
      title: String(p.title).slice(0, 200),
      summary: String(p.summary ?? "").slice(0, 4000),
      startChapter: p.startChapter,
      endChapter: typeof p.endChapter === "number" ? p.endChapter : undefined,
      status: STATUS_VALUES.includes(p.status as SwVolume["status"])
        ? (p.status as SwVolume["status"])
        : "planned",
    });
  } else if (body.op === "update") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const idx = volumes.findIndex((v) => v.id === body.targetId);
    if (idx < 0) return NextResponse.json({ error: "Không tìm thấy volume" }, { status: 404 });
    const p = body.payload ?? {};
    volumes[idx] = {
      ...volumes[idx],
      title: typeof p.title === "string" ? p.title.slice(0, 200) : volumes[idx].title,
      summary: typeof p.summary === "string" ? p.summary.slice(0, 4000) : volumes[idx].summary,
      startChapter: typeof p.startChapter === "number" ? p.startChapter : volumes[idx].startChapter,
      endChapter: typeof p.endChapter === "number" ? p.endChapter : volumes[idx].endChapter,
      status: STATUS_VALUES.includes(p.status as SwVolume["status"])
        ? (p.status as SwVolume["status"])
        : volumes[idx].status,
    };
  } else if (body.op === "delete") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const remaining = volumes.filter((v) => v.id !== body.targetId);
    volumes.length = 0;
    volumes.push(...remaining);
  } else {
    return NextResponse.json({ error: "op không hợp lệ" }, { status: 400 });
  }

  await col.updateOne(
    { _id: bookId, userId },
    { $set: { volumes, updatedAt: new Date() } },
  );
  return NextResponse.json({ volumes });
}

export const GET = rateLimitedRoute("story-writer-books-id-volumes", _handler_GET);

export const POST = rateLimitedRoute("story-writer-books-id-volumes", _handler_POST);
