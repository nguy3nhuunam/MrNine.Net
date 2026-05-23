import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  booksCol,
  toId,
  type SwCharacter,
  type SwRelationship,
} from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function nextId(prefix: string, existing: ReadonlyArray<{ id: string }>): string {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  const max = existing
    .map((item) => {
      const m = item.id.match(re);
      return m ? Number.parseInt(m[1], 10) : 0;
    })
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${max + 1}`;
}

async function _handler_GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const book = await (await booksCol()).findOne({ _id: toId(id), userId: session.user.id });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });
  return NextResponse.json({
    characters: book.characters ?? [],
    relationships: book.relationships ?? [],
  });
}

async function _handler_POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: {
    op: "addCharacter" | "updateCharacter" | "deleteCharacter" | "addRelationship" | "updateRelationship" | "deleteRelationship";
    payload?: Partial<SwCharacter> & Partial<SwRelationship>;
    targetId?: string;
  } = { op: "addCharacter" };
  try {
    body = await request.json();
  } catch {}

  const bookId = toId(id);
  const col = await booksCol();
  const book = await col.findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const characters = [...(book.characters ?? [])];
  const relationships = [...(book.relationships ?? [])];

  if (body.op === "addCharacter") {
    const p = body.payload ?? {};
    if (!p.name || !p.role) return NextResponse.json({ error: "Thiếu name/role" }, { status: 400 });
    characters.push({
      id: nextId("c", characters),
      name: String(p.name).slice(0, 200),
      role: String(p.role).slice(0, 50),
      profile: String(p.profile ?? "").slice(0, 4000),
      aliases: Array.isArray(p.aliases) ? p.aliases.map(String).slice(0, 10) : [],
    });
  } else if (body.op === "updateCharacter") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const idx = characters.findIndex((c) => c.id === body.targetId);
    if (idx < 0) return NextResponse.json({ error: "Không tìm thấy character" }, { status: 404 });
    const p = body.payload ?? {};
    characters[idx] = {
      ...characters[idx],
      name: typeof p.name === "string" ? p.name.slice(0, 200) : characters[idx].name,
      role: typeof p.role === "string" ? p.role.slice(0, 50) : characters[idx].role,
      profile: typeof p.profile === "string" ? p.profile.slice(0, 4000) : characters[idx].profile,
      aliases: Array.isArray(p.aliases) ? p.aliases.map(String).slice(0, 10) : characters[idx].aliases,
    };
  } else if (body.op === "deleteCharacter") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const remaining = characters.filter((c) => c.id !== body.targetId);
    const remainingRel = relationships.filter(
      (r) => r.fromCharacterId !== body.targetId && r.toCharacterId !== body.targetId,
    );
    characters.length = 0;
    characters.push(...remaining);
    relationships.length = 0;
    relationships.push(...remainingRel);
  } else if (body.op === "addRelationship") {
    const p = body.payload ?? {};
    if (!p.fromCharacterId || !p.toCharacterId || !p.kind) {
      return NextResponse.json({ error: "Thiếu fromCharacterId/toCharacterId/kind" }, { status: 400 });
    }
    if (!characters.some((c) => c.id === p.fromCharacterId) || !characters.some((c) => c.id === p.toCharacterId)) {
      return NextResponse.json({ error: "Character không tồn tại" }, { status: 400 });
    }
    relationships.push({
      id: nextId("r", relationships),
      fromCharacterId: String(p.fromCharacterId),
      toCharacterId: String(p.toCharacterId),
      kind: p.kind as SwRelationship["kind"],
      label: typeof p.label === "string" ? p.label.slice(0, 200) : undefined,
      note: typeof p.note === "string" ? p.note.slice(0, 500) : undefined,
    });
  } else if (body.op === "updateRelationship") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const idx = relationships.findIndex((r) => r.id === body.targetId);
    if (idx < 0) return NextResponse.json({ error: "Không tìm thấy relationship" }, { status: 404 });
    const p = body.payload ?? {};
    relationships[idx] = {
      ...relationships[idx],
      kind: typeof p.kind === "string" ? (p.kind as SwRelationship["kind"]) : relationships[idx].kind,
      label: typeof p.label === "string" ? p.label.slice(0, 200) : relationships[idx].label,
      note: typeof p.note === "string" ? p.note.slice(0, 500) : relationships[idx].note,
    };
  } else if (body.op === "deleteRelationship") {
    if (!body.targetId) return NextResponse.json({ error: "Thiếu targetId" }, { status: 400 });
    const remaining = relationships.filter((r) => r.id !== body.targetId);
    relationships.length = 0;
    relationships.push(...remaining);
  } else {
    return NextResponse.json({ error: "op không hợp lệ" }, { status: 400 });
  }

  await col.updateOne(
    { _id: bookId, userId },
    { $set: { characters, relationships, updatedAt: new Date() } },
  );

  return NextResponse.json({ characters, relationships });
}

export const GET = safeJsonRoute(_handler_GET);

export const POST = safeJsonRoute(_handler_POST);
