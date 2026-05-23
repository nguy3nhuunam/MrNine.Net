import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, chaptersCol, toId, truthCol, TRUTH_KINDS } from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function _handler_POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { from?: string; to?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const from = (body.from ?? "").trim();
  const to = (body.to ?? "").trim();
  if (!from || !to) return NextResponse.json({ error: "Thiếu from / to" }, { status: 400 });
  if (from === to) return NextResponse.json({ error: "from và to phải khác nhau" }, { status: 400 });
  if (from.length < 1 || from.length > 50) {
    return NextResponse.json({ error: "from quá ngắn / quá dài" }, { status: 400 });
  }

  const bookId = toId(id);
  const book = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const re = new RegExp(escapeRegex(from), "g");

  // Replace inside book metadata (story_bible, book_rules, volume_outline, characters[].name/profile)
  const updatedBookFields: Record<string, unknown> = { updatedAt: new Date() };
  let bookHits = 0;
  for (const field of ["storyBible", "bookRules", "volumeOutline", "authorIntent", "currentFocus", "brief"] as const) {
    const value = book[field];
    if (typeof value === "string" && re.test(value)) {
      re.lastIndex = 0;
      bookHits += value.match(re)?.length ?? 0;
      updatedBookFields[field] = value.replace(re, to);
    }
  }
  if (Array.isArray(book.characters)) {
    let charsTouched = false;
    const next = book.characters.map((c) => {
      const newName = c.name.replace(re, to);
      const newProfile = c.profile.replace(re, to);
      if (newName !== c.name || newProfile !== c.profile) charsTouched = true;
      return { ...c, name: newName, profile: newProfile };
    });
    if (charsTouched) updatedBookFields.characters = next;
  }
  if (Object.keys(updatedBookFields).length > 1) {
    await (await booksCol()).updateOne({ _id: bookId, userId }, { $set: updatedBookFields });
  }

  // Replace across all 7 truth files
  const truth = await truthCol();
  let truthHits = 0;
  for (const kind of TRUTH_KINDS) {
    const doc = await truth.findOne({ bookId, userId, kind });
    if (!doc?.content) continue;
    if (!re.test(doc.content)) continue;
    re.lastIndex = 0;
    truthHits += doc.content.match(re)?.length ?? 0;
    await truth.updateOne(
      { _id: doc._id },
      { $set: { content: doc.content.replace(re, to), updatedAt: new Date() }, $inc: { version: 1 } },
    );
  }

  // Replace across chapters (draft + finalText + intent + title)
  const chapters = await chaptersCol();
  const allChapters = await chapters.find({ bookId, userId }).toArray();
  let chapterHits = 0;
  for (const ch of allChapters) {
    const update: Record<string, unknown> = {};
    for (const field of ["draft", "finalText", "intent", "title", "contextBrief"] as const) {
      const value = ch[field];
      if (typeof value === "string" && re.test(value)) {
        re.lastIndex = 0;
        chapterHits += value.match(re)?.length ?? 0;
        update[field] = value.replace(re, to);
      }
    }
    if (Object.keys(update).length) {
      update.updatedAt = new Date();
      await chapters.updateOne({ _id: ch._id }, { $set: update });
    }
  }

  return NextResponse.json({
    from,
    to,
    bookHits,
    truthHits,
    chapterHits,
    chaptersScanned: allChapters.length,
  });
}

export const POST = safeJsonRoute(_handler_POST);
