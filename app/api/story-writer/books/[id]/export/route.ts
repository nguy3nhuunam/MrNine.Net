import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, chaptersCol, toId } from "@/lib/story-writer/store";
import { buildEpub, type EpubChapter } from "@/lib/story-writer/epub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function safeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "story"
  );
}

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "txt").toLowerCase();
  const approvedOnly = url.searchParams.get("approvedOnly") === "1";

  const book = await (await booksCol()).findOne({ _id: toId(id), userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const filter: Record<string, unknown> = { bookId: book._id, userId };
  if (approvedOnly) filter.status = "approved";
  const chapters = await (await chaptersCol()).find(filter).sort({ number: 1 }).toArray();
  if (!chapters.length) {
    return NextResponse.json({ error: "Không có chương nào để xuất" }, { status: 412 });
  }

  const items: EpubChapter[] = chapters.map((ch) => ({
    number: ch.number,
    title: ch.title,
    body: (ch.finalText || ch.draft || "")
      .replace(/^##\s*[Cc]hương\s*\d+\s*[:.\-]\s*[^\n]*\n?/m, "")
      .trim(),
  }));

  const fileBase = safeFileName(book.title);

  if (format === "txt") {
    const txt = items
      .map((ch) => `Chương ${ch.number}: ${ch.title}\n\n${ch.body}`)
      .join("\n\n========\n\n");
    return new NextResponse(txt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}.txt"`,
      },
    });
  }

  if (format === "md" || format === "markdown") {
    const md = items
      .map((ch) => `## Chương ${ch.number}: ${ch.title}\n\n${ch.body}`)
      .join("\n\n");
    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}.md"`,
      },
    });
  }

  if (format === "epub") {
    const buffer = buildEpub({
      title: book.title,
      author: session.user.name ?? "MrNine Story Writer",
      chapters: items,
    });
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${fileBase}.epub"`,
        "Content-Length": String(buffer.length),
      },
    });
  }

  return NextResponse.json({ error: "Định dạng không hỗ trợ (txt | md | epub)" }, { status: 400 });
}
