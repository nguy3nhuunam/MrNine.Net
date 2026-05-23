import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, chaptersCol, memoryCol, projectsCol, toId, truthCol } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;

  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Tên dự án không được trống" }, { status: 400 });

  const col = await projectsCol();
  const result = await col.findOneAndUpdate(
    { _id: toId(id), userId: session.user.id },
    { $set: { name, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
  return NextResponse.json({ id: String(result._id), name: result.name, updatedAt: result.updatedAt });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const projectId = toId(id);
  const userId = session.user.id;

  const proj = await projectsCol();
  const owned = await proj.findOne({ _id: projectId, userId });
  if (!owned) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  // Cascade — find books in this project then drop their truth/chapters/memory.
  const books = await (await booksCol()).find({ projectId, userId }).toArray();
  const bookIds = books.map((b) => b._id!).filter(Boolean);
  if (bookIds.length) {
    await Promise.all([
      (await truthCol()).deleteMany({ bookId: { $in: bookIds }, userId }),
      (await chaptersCol()).deleteMany({ bookId: { $in: bookIds }, userId }),
      (await memoryCol()).deleteMany({ bookId: { $in: bookIds }, userId }),
      (await booksCol()).deleteMany({ _id: { $in: bookIds }, userId }),
    ]);
  }
  await proj.deleteOne({ _id: projectId, userId });
  return NextResponse.json({ ok: true });
}
