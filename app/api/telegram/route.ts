/**
 * POST /api/telegram — Telegram webhook handler.
 *
 * Header `X-Telegram-Bot-Api-Secret-Token` phải match `TELEGRAM_WEBHOOK_SECRET`.
 *
 * Commands:
 *   /start <token>  — link Telegram chat với MrNine account
 *   /balance        — show số dư + lifetime spend
 *   /usage          — usage 24h + top model
 *   /help           — list commands
 */
import { NextResponse } from "next/server";
import { and, eq, gt, gte, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { requests, telegramLinkTokens, users } from "@/lib/pg/schema";
import { sendMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TgUpdate = {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string };
    text?: string;
  };
};

const HELP = `🤖 *MrNine Bot*

Commands:
\`/start <token>\` — link tài khoản (lấy token từ /dashboard/settings)
\`/balance\` — số dư hiện tại
\`/usage\` — usage 24h
\`/help\` — show commands

Web: https://mrnine.net`;

async function lookupChat(chatId: number) {
  return (
    await db
      .select()
      .from(users)
      .where(eq(users.telegramChatId, chatId))
      .limit(1)
  )[0] ?? null;
}

function fmtUsd(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(4)}`;
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as TgUpdate;
  const msg = body.message;
  if (!msg?.text || !msg.chat?.id) {
    return NextResponse.json({ ok: true, ignored: "no_message" });
  }

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // /start <token>
  if (text.startsWith("/start")) {
    const tokenArg = text.split(/\s+/)[1] ?? "";
    if (!tokenArg) {
      await sendMessage(chatId, HELP);
      return NextResponse.json({ ok: true });
    }
    const linkRow = (
      await db
        .select()
        .from(telegramLinkTokens)
        .where(
          and(
            eq(telegramLinkTokens.token, tokenArg),
            isNull(telegramLinkTokens.usedAt),
            gt(telegramLinkTokens.expiresAt, new Date()),
          ),
        )
        .limit(1)
    )[0];
    if (!linkRow) {
      await sendMessage(chatId, "❌ Token không hợp lệ hoặc đã hết hạn. Mở /dashboard/settings để lấy token mới.");
      return NextResponse.json({ ok: true, ignored: "invalid_token" });
    }
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ telegramChatId: chatId })
        .where(eq(users.id, linkRow.userId));
      await tx
        .update(telegramLinkTokens)
        .set({ usedAt: new Date() })
        .where(eq(telegramLinkTokens.token, tokenArg));
    });
    await sendMessage(chatId, "✅ Đã liên kết tài khoản. Gõ `/balance` hoặc `/usage` để xem nhanh.");
    return NextResponse.json({ ok: true });
  }

  if (text === "/help") {
    await sendMessage(chatId, HELP);
    return NextResponse.json({ ok: true });
  }

  // Commands cần linked account.
  const me = await lookupChat(chatId);
  if (!me) {
    await sendMessage(
      chatId,
      "Chưa liên kết tài khoản. Mở https://mrnine.net/dashboard/settings để lấy token rồi gõ `/start <token>`.",
    );
    return NextResponse.json({ ok: true, ignored: "not_linked" });
  }

  if (text === "/balance") {
    await sendMessage(
      chatId,
      `💰 *Số dư:* ${fmtUsd(me.balanceMicroUsd)}\n` +
        `Lifetime topup: ${fmtUsd(me.lifetimeTopupMicroUsd)}\n` +
        `Lifetime spend: ${fmtUsd(me.lifetimeSpendMicroUsd)}`,
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/usage") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = (
      await db
        .select({
          requestsTotal: sql<number>`count(*)`,
          tokens: sql<number>`coalesce(sum(${requests.totalTokens}), 0)`,
          cost: sql<number>`coalesce(sum(${requests.costUserMicroUsd}), 0)`,
        })
        .from(requests)
        .where(and(eq(requests.userId, me.id), gte(requests.createdAt, since)))
    )[0];

    const topModel = (
      await db
        .select({ name: requests.publicModel, c: sql<number>`count(*)` })
        .from(requests)
        .where(and(eq(requests.userId, me.id), gte(requests.createdAt, since)))
        .groupBy(requests.publicModel)
        .orderBy(sql`count(*) desc`)
        .limit(1)
    )[0];

    await sendMessage(
      chatId,
      `📊 *Usage 24h*\n` +
        `Requests: ${Number(stats.requestsTotal).toLocaleString("vi-VN")}\n` +
        `Tokens: ${Number(stats.tokens).toLocaleString("vi-VN")}\n` +
        `Cost: ${fmtUsd(Number(stats.cost))}\n` +
        `Top model: \`${topModel?.name ?? "—"}\``,
    );
    return NextResponse.json({ ok: true });
  }

  // Unknown command.
  await sendMessage(chatId, HELP);
  return NextResponse.json({ ok: true });
}
