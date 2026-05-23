import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runArchitectSkeleton, runArchitectTruth } from "@/lib/story-writer/architect";
import { applyTruthDelta } from "@/lib/story-writer/pipeline";
import { booksCol, toId, truthCol, TRUTH_KINDS } from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 50;

type Ctx = { params: Promise<{ id: string }> };

// stage=skeleton  -> only generate bible/rules/outline/cast/relationships/foreshadows/volumes
// stage=truth     -> only generate the 7 truth file seeds (skeleton must already exist)
// stage=all       -> default; runs both stages back to back. Use when split fits inside 60s.
async function _handler_POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const url = new URL(request.url);
  const stage = (url.searchParams.get("stage") || "all").toLowerCase();
  if (!["skeleton", "truth", "all"].includes(stage)) {
    return NextResponse.json({ error: "stage phải là skeleton | truth | all" }, { status: 400 });
  }

  const bookId = toId(id);
  const col = await booksCol();
  const book = await col.findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  try {
    if (stage === "skeleton" || stage === "all") {
      const skeleton = await runArchitectSkeleton({
        title: book.title,
        genreId: book.genre,
        brief: book.brief,
        authorIntent: book.authorIntent,
        currentFocus: book.currentFocus,
        chapterWords: book.chapterWords,
        targetChapters: book.targetChapters,
        llm: book.llm ?? null,
      });

      const charById = new Map<string, string>();
      const characters = (skeleton.characters ?? []).map((c, idx) => {
        const cid = `c${idx + 1}`;
        charById.set(c.name.trim().toLowerCase(), cid);
        return {
          id: cid,
          name: c.name.trim(),
          role: c.role,
          profile: c.profile,
          aliases: c.aliases ?? [],
        };
      });
      const relationships = (skeleton.relationships ?? [])
        .map((rel, idx) => {
          const fromId = charById.get(rel.fromName?.trim?.().toLowerCase?.() ?? "");
          const toId2 = charById.get(rel.toName?.trim?.().toLowerCase?.() ?? "");
          if (!fromId || !toId2) return null;
          return {
            id: `r${idx + 1}`,
            fromCharacterId: fromId,
            toCharacterId: toId2,
            kind: rel.kind as
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
              | "custom",
            label: rel.label,
            note: rel.note,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      const foreshadows = (skeleton.foreshadows ?? []).map((f, idx) => ({
        id: `f${idx + 1}`,
        summary: f.summary,
        status: "open" as const,
        expectedResolutionChapter: f.expectedResolutionChapter,
      }));
      const volumes = (skeleton.volumes ?? []).map((v) => ({
        id: `v${v.number}`,
        number: v.number,
        title: v.title,
        summary: v.summary,
        startChapter: v.startChapter,
        endChapter: v.endChapter,
        status: "planned" as const,
      }));

      await col.updateOne(
        { _id: bookId, userId },
        {
          $set: {
            storyBible: skeleton.storyBible,
            bookRules: skeleton.bookRules,
            volumeOutline: skeleton.volumeOutline,
            characters,
            relationships,
            foreshadows,
            volumes,
            updatedAt: new Date(),
          },
        },
      );

      if (stage === "skeleton") {
        return NextResponse.json({ ok: true, stage: "skeleton", characters, relationships, foreshadows, volumes });
      }
    }

    if (stage === "truth" || stage === "all") {
      const refreshed = await col.findOne({ _id: bookId, userId });
      if (!refreshed) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });
      if (!refreshed.storyBible) {
        return NextResponse.json(
          { error: "Cần chạy stage=skeleton trước khi sinh truth seeds" },
          { status: 412 },
        );
      }
      const truthSeeds = await runArchitectTruth({
        title: refreshed.title,
        genreId: refreshed.genre,
        skeleton: {
          storyBible: refreshed.storyBible,
          bookRules: refreshed.bookRules,
          volumeOutline: refreshed.volumeOutline,
          characters: (refreshed.characters ?? []).map((c) => ({
            name: c.name,
            role: c.role,
            profile: c.profile,
            aliases: c.aliases,
          })),
          relationships: [],
          foreshadows: [],
          volumes: [],
        },
        llm: refreshed.llm ?? null,
      });

      const truth = await truthCol();
      const docs = await truth.find({ bookId, userId }).toArray();
      for (const kind of TRUTH_KINDS) {
        const seed = truthSeeds[kind as keyof typeof truthSeeds];
        if (!seed) continue;
        const doc = docs.find((d) => d.kind === kind);
        const isBlank = !doc?.content || doc.content.trim().length < 8;
        if (isBlank) {
          await applyTruthDelta(bookId, userId, { [kind]: seed });
        }
      }

      return NextResponse.json({ ok: true, stage });
    }

    return NextResponse.json({ ok: true, stage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Architect thất bại", stage },
      { status: 502 },
    );
  }
}

export const POST = safeJsonRoute(_handler_POST);
