import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { projectsCol } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const col = await projectsCol();
  const list = await col.find({ userId }).sort({ updatedAt: -1 }).limit(50).toArray();
  return NextResponse.json({
    projects: list.map((p) => ({ id: String(p._id), name: p.name, updatedAt: p.updatedAt })),
  });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });

  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Tên dự án không được trống" }, { status: 400 });

  const col = await projectsCol();
  const now = new Date();
  const result = await col.insertOne({
    userId,
    name,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id: String(result.insertedId), name, updatedAt: now });
}
