import { NextResponse } from "next/server";
import { astro } from "iztro";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChartRequest = {
  date?: string;
  hourIndex?: number;
  gender?: "male" | "female";
  language?: "vi-VN" | "en-US" | "zh-CN";
  fixLeap?: boolean;
};

function parseRequest(body: unknown): ChartRequest {
  if (!body || typeof body !== "object") return {};
  const candidate = body as Record<string, unknown>;
  return {
    date: typeof candidate.date === "string" ? candidate.date : undefined,
    hourIndex: typeof candidate.hourIndex === "number" ? candidate.hourIndex : undefined,
    gender: candidate.gender === "male" || candidate.gender === "female" ? candidate.gender : undefined,
    language:
      candidate.language === "en-US" || candidate.language === "zh-CN" || candidate.language === "vi-VN"
        ? candidate.language
        : "vi-VN",
    fixLeap: typeof candidate.fixLeap === "boolean" ? candidate.fixLeap : true,
  };
}

async function _handler_POST(request: Request, _ctx: GuardContext) {
  void _ctx;
  const body = await request.json().catch(() => null);
  const params = parseRequest(body);

  if (!params.date || params.hourIndex === undefined || !params.gender) {
    return NextResponse.json(
      { error: "Cần ngày sinh dương lịch (YYYY-MM-DD), giờ sinh và giới tính." },
      { status: 400 },
    );
  }

  const genderInput = params.gender === "male" ? "男" : "女";

  try {
    const astrolabe = astro.bySolar(
      params.date,
      params.hourIndex,
      genderInput,
      Boolean(params.fixLeap),
      params.language ?? "vi-VN",
    );

    return NextResponse.json({
      gender: astrolabe.gender,
      solarDate: astrolabe.solarDate,
      lunarDate: astrolabe.lunarDate,
      chineseDate: astrolabe.chineseDate,
      time: astrolabe.time,
      timeRange: astrolabe.timeRange,
      sign: astrolabe.sign,
      zodiac: astrolabe.zodiac,
      soul: astrolabe.soul,
      body: astrolabe.body,
      fiveElementsClass: astrolabe.fiveElementsClass,
      earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
      earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
      palaces: astrolabe.palaces.map((palace) => ({
        index: palace.index,
        name: palace.name,
        isBodyPalace: palace.isBodyPalace,
        isOriginalPalace: palace.isOriginalPalace,
        heavenlyStem: palace.heavenlyStem,
        earthlyBranch: palace.earthlyBranch,
        majorStars: palace.majorStars,
        minorStars: palace.minorStars,
        adjectiveStars: palace.adjectiveStars,
        changsheng12: palace.changsheng12,
        decadal: palace.decadal,
        ages: palace.ages,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tạo lá số." },
      { status: 400 },
    );
  }
}

export const POST = guardedRoute(
  { route: "mystic-ziwei", requireUser: true },
  _handler_POST,
);
