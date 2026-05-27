import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { chaptersCol, toId } from "@/lib/story-writer/store";
import { rateLimitedRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; index: string }> };

async function _handler_POST(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id, index } = await ctx.params;
  const idx = Number.parseInt(index, 10);
  if (!Number.isFinite(idx) || idx < 0) {
    return NextResponse.json({ error: "Snapshot index không hợp lệ" }, { status: 400 });
  }
  const userId = session.user.id;

  const chapters = await chaptersCol();
  const ch = await chapters.findOne({ _id: toId(id), userId });
  if (!ch) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  const snap = ch.snapshots?.[idx];
  if (!snap) return NextResponse.json({ error: "Snapshot không tồn tại" }, { status: 404 });

  const snapshots = ch.snapshots ?? [];
  snapshots.unshift({ at: new Date(), text: ch.draft ?? "", label: `pre-restore-from-${idx}` });

  await chapters.updateOne(
    { _id: ch._id, userId },
    {
      $set: {
        draft: snap.text,
        status: "drafted",
        snapshots: snapshots.slice(0, 12),
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true, draft: snap.text });
}

export const POST = rateLimitedRoute("story-writer-chapters-id-snapshots-index-restore", _handler_POST);
