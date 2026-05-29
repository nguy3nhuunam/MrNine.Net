import Link from "next/link";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { modelMap } from "@/lib/pg/schema";

export const metadata = {
  title: "Bảng giá · MrNine",
  description: "Pricing pay-as-you-go cho API gateway, AI Playground và các tools khác. Thanh toán VND qua VietQR.",
};

export const dynamic = "force-dynamic";
export const revalidate = 300;

const VND_RATE = parseInt(process.env.USD_VND_RATE ?? "25500", 10);

function tagFor(provider: string, publicName: string): string {
  const p = provider.toLowerCase();
  const n = publicName.toLowerCase();
  if (n.includes("haiku") || n.includes("mini") || n.includes("flash")) return "Rẻ";
  if (n.includes("opus") || n.includes("ultra") || n.includes("xhigh")) return "Cao cấp";
  if (n.includes("vision") || n.includes("multi") || n.includes("gemini")) return "Multimodal";
  if (p === "openrouter") return "Failover";
  return "Cốt lõi";
}

function fmtPerMtok(usdPerMtok: number, markup: number): { usd: string; vnd: string } {
  const final = usdPerMtok * markup;
  return {
    usd: `$${final.toFixed(2)}`,
    vnd: `${Math.round(final * VND_RATE).toLocaleString("vi-VN")}đ`,
  };
}

export default async function PricingPage() {
  let rows: { publicName: string; provider: string; inputCost: string; outputCost: string; markup: string }[] = [];
  try {
    rows = await db
      .select({
        publicName: modelMap.publicName,
        provider: modelMap.provider,
        inputCost: modelMap.inputCostPerMtok,
        outputCost: modelMap.outputCostPerMtok,
        markup: modelMap.markup,
      })
      .from(modelMap)
      .where(eq(modelMap.enabled, true))
      .orderBy(asc(modelMap.publicName));
  } catch (e) {
    console.error("[pricing] load failed", e);
  }

  const tiers = rows.map((r) => ({
    model: r.publicName,
    provider: r.provider,
    tag: tagFor(r.provider, r.publicName),
    input: fmtPerMtok(Number(r.inputCost), Number(r.markup)),
    output: fmtPerMtok(Number(r.outputCost), Number(r.markup)),
    markup: Number(r.markup),
  }));

  return (
    <main className="min-h-screen bg-[#090807] text-[#f4eadc]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link href="/" className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[#9a9087]">
          ← mrnine.net
        </Link>
        <h1 className="mt-3 text-4xl font-semibold">Bảng giá</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#c8bdaf]">
          Pay-as-you-go. Nạp một lần, dùng cho mọi sản phẩm — API, AI Playground, Voice Studio, Story Writer,
          Flashcards, Photo Fix.
        </p>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card title="API Gateway" subtitle="OpenAI-compatible · sk-mrnine-*" highlight>
            <ul className="mt-3 space-y-2 text-sm text-[#c8bdaf]">
              <li>• Endpoint: <code className="text-[#dff8e4]">https://api.mrnine.net/v1</code></li>
              <li>• Tương thích Codex, OpenAI SDK, Cursor, Claude Code, mọi client OpenAI-compatible</li>
              <li>• Markup ~20% trên giá provider</li>
              <li>• Chuyển $ → VND theo tỷ giá ngày, hiện tại 1 USD ≈ {VND_RATE.toLocaleString("vi-VN")} VND</li>
              <li>• Free credit khi đăng ký: <span className="text-[#dff8e4]">$0.5</span></li>
            </ul>
            <Link
              href="/api-docs"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#f4eadc]"
            >
              Xem docs →
            </Link>
          </Card>

          <Card title="Playground & tools" subtitle="FAL · 162 model image/video/voice">
            <ul className="mt-3 space-y-2 text-sm text-[#c8bdaf]">
              <li>• AI Playground: text-to-image, image-edit, text-to-video, image-to-video, motion control</li>
              <li>• Voice Studio (OmniVoice TTS), Story Writer, Flashcards (FSRS-6), Photo Fix, Smart Recap</li>
              <li>• Pricing tham chiếu từ FAL gốc, cộng phí dịch vụ ~10–20% tuỳ model</li>
              <li>• Dùng chung credit với API Gateway</li>
            </ul>
            <Link
              href="/ai-playground"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#f4eadc]"
            >
              Mở Playground →
            </Link>
          </Card>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#9a9087]">
            Bảng giá API ({tiers.length} models đang bật)
          </h2>
          <p className="mt-2 text-xs text-[#5d544a]">
            Giá đã cộng markup. Cập nhật tự động từ admin · cache 5 phút. Đăng nhập để xem usage realtime.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
                <tr>
                  <th className="px-3 py-2 text-left">Tag</th>
                  <th className="px-3 py-2 text-left">Model</th>
                  <th className="px-3 py-2 text-right">Input / 1M tokens</th>
                  <th className="px-3 py-2 text-right">Output / 1M tokens</th>
                </tr>
              </thead>
              <tbody>
                {tiers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[#5d544a]">
                      Chưa có model nào được bật. Liên hệ admin.
                    </td>
                  </tr>
                ) : (
                  tiers.map((row) => (
                    <tr key={row.model} className="border-t border-white/5">
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#dff8e4]">
                          {row.tag}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{row.model}</td>
                      <td className="px-3 py-2 text-right">
                        <div>{row.input.usd}</div>
                        <div className="text-[0.7rem] text-[#5d544a]">{row.input.vnd}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div>{row.output.usd}</div>
                        <div className="text-[0.7rem] text-[#5d544a]">{row.output.vnd}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <Mini title="Nạp tiền" desc="VietQR (Vietcombank, MB, Tech, ACB...). Nạp tối thiểu 50.000đ. Tự động cộng vào balance." />
          <Mini title="Refund" desc="Không hoàn tiền cho usage đã consume. Hoàn nếu provider lỗi 5xx hoặc bị suspend bất ngờ." />
          <Mini title="Hoá đơn VAT" desc="Liên hệ admin nếu cần xuất hoá đơn cho doanh nghiệp." />
        </section>

        <p className="mt-12 text-center text-xs text-[#5d544a]">
          Cần báo giá theo volume hoặc partner? Liên hệ{" "}
          <a href="mailto:hello@mrnine.net" className="text-[#ef4444]">
            hello@mrnine.net
          </a>
          .
        </p>
      </div>
    </main>
  );
}

function Card({
  title,
  subtitle,
  highlight,
  children,
}: {
  title: string;
  subtitle: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "rounded-2xl border bg-[#0c0a08] p-6 " +
        (highlight ? "border-[#ef4444]/35 shadow-[0_24px_60px_-30px_rgba(239,68,68,0.45)]" : "border-white/10")
      }
    >
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#5d544a]">{subtitle}</div>
      <h3 className="mt-2 text-2xl font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Mini({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#dff8e4]">{title}</div>
      <p className="mt-2 text-xs text-[#c8bdaf]">{desc}</p>
    </div>
  );
}
