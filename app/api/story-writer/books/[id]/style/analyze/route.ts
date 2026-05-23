import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, toId } from "@/lib/story-writer/store";
import { buildFingerprint, describeStyle } from "@/lib/story-writer/style";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const MAX_SAMPLE = 60_000;

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { sample?: string; saveAsBookStyle?: boolean } = {};
  try {
    body = await request.json();
  } catch {}
  const sample = (body.sample ?? "").trim();
  if (!sample) return NextResponse.json({ error: "Cần văn bản mẫu" }, { status: 400 });
  if (sample.length > MAX_SAMPLE) {
    return NextResponse.json({ error: `Mẫu quá dài (>${MAX_SAMPLE} ký tự)` }, { status: 413 });
  }

  const book = await (await booksCol()).findOne({ _id: toId(id), userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  try {
    const fingerprint = buildFingerprint(sample);
    const styleGuide = await describeStyle({ fingerprint, llm: book.llm ?? null });

    if (body.saveAsBookStyle !== false) {
      await (await booksCol()).updateOne(
        { _id: book._id, userId },
        { $set: { styleFingerprint: fingerprint, styleGuide, updatedAt: new Date() } },
      );
    }

    return NextResponse.json({ fingerprint, styleGuide });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Style analyze thất bại" },
      { status: 502 },
    );
  }
}
