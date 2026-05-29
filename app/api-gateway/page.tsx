import Link from "next/link";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { modelMap } from "@/lib/pg/schema";

const og = "/api/og?title=API%20Gateway&subtitle=OpenAI-compatible%20%C2%B7%20VietQR&accent=red";

export const metadata = {
  title: "API Gateway · MrNine",
  description:
    "OpenAI-compatible API gateway cho dev VN. Tương thích Codex, OpenAI SDK, Cursor, Claude Code. Thanh toán VietQR, markup ~20%.",
  openGraph: {
    title: "MrNine API Gateway",
    description: "API gateway tương thích OpenAI cho dev VN. Codex, OpenAI SDK, Cursor, Claude Code. Thanh toán VietQR.",
    images: [og],
  },
  twitter: {
    card: "summary_large_image",
    title: "MrNine API Gateway",
    description: "OpenAI-compatible API gateway, thanh toán VietQR.",
    images: [og],
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 300;

const VND_RATE = parseInt(process.env.USD_VND_RATE ?? "25500", 10);

function tagFor(provider: string, publicName: string): string {
  const n = publicName.toLowerCase();
  const p = provider.toLowerCase();
  if (n.includes("haiku") || n.includes("mini") || n.includes("flash")) return "Rẻ";
  if (n.includes("opus") || n.includes("ultra") || n.includes("xhigh")) return "Cao cấp";
  if (n.includes("vision") || n.includes("multi") || n.includes("gemini")) return "Multimodal";
  if (n.includes("embed")) return "Embed";
  if (n.includes("whisper") || n.includes("tts")) return "Audio";
  if (n.includes("dall-e") || n.includes("image")) return "Image";
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

export default async function ApiGatewayPage() {
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
    console.error("[api-gateway] load failed", e);
  }

  const tiers = rows.map((r) => ({
    model: r.publicName,
    provider: r.provider,
    tag: tagFor(r.provider, r.publicName),
    input: fmtPerMtok(Number(r.inputCost), Number(r.markup)),
    output: fmtPerMtok(Number(r.outputCost), Number(r.markup)),
  }));

  const featured = tiers.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#0b0a08] text-[#e8dfd4]">
      {/* Ambient + grid full-bleed như HomeCommandSurface */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_16%_10%,rgba(239,68,68,0.16),transparent_30%),radial-gradient(circle_at_80%_14%,rgba(214,165,72,0.08),transparent_24%),linear-gradient(180deg,#0d0c0a_0%,#070604_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(94,86,75,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(94,86,75,0.055)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />

      {/* HERO full-bleed */}
      <section className="relative border-b border-white/8">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/8 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-[#ef4444]">
            <span className="size-1.5 rounded-full bg-[#ef4444]" />
            OpenAI-compatible · Live
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            API Gateway cho dev <span className="text-[#ef4444]">Việt Nam</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-[#c8bdaf] md:text-lg">
            Một API key — chạy được Codex, OpenAI SDK, Cursor, Claude Code và mọi client OpenAI-compatible khác. Thanh toán VietQR. Free $0.5 lúc đăng ký.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#ef4444] px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#090807] transition hover:bg-[#dc2626]"
            >
              Đăng ký nhận $0.5 →
            </Link>
            <Link
              href="/api-docs"
              className="rounded-lg border border-white/15 bg-white/5 px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#c8bdaf] transition hover:border-white/40 hover:text-[#f4eadc]"
            >
              Xem docs
            </Link>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Endpoint" value="api.mrnine.net" mono />
            <Stat label="Markup" value="~20%" />
            <Stat label="Min topup" value="50.000đ" />
            <Stat label="Tỷ giá" value={`1$ ≈ ${VND_RATE.toLocaleString("vi-VN")}đ`} />
          </div>
        </div>
      </section>

      {/* QUICKSTART code blocks */}
      <section className="border-b border-white/8">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#9a9087]">
                Quickstart
              </p>
              <h2 className="mt-1 text-3xl font-semibold">3 dòng để bắt đầu</h2>
            </div>
            <Link
              href="/api-docs"
              className="hidden text-sm text-[#9a9087] hover:text-[#f4eadc] md:inline-block"
            >
              Tất cả ngôn ngữ →
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CodeCard
              title="curl"
              language="bash"
              code={`curl https://api.mrnine.net/v1/chat/completions \\
  -H "Authorization: Bearer sk-mrnine-..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5.4","messages":[{"role":"user","content":"hi"}]}'`}
            />
            <CodeCard
              title="OpenAI SDK · Python"
              language="python"
              code={`from openai import OpenAI

client = OpenAI(
    base_url="https://api.mrnine.net/v1",
    api_key="sk-mrnine-...",
)
r = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "hi"}],
)
print(r.choices[0].message.content)`}
            />
          </div>
        </div>
      </section>

      {/* FEATURED MODELS — preview pricing */}
      <section className="border-b border-white/8">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#9a9087]">
                Models
              </p>
              <h2 className="mt-1 text-3xl font-semibold">{tiers.length} model đang bật</h2>
            </div>
            <Link
              href="#full-pricing"
              className="hidden text-sm text-[#9a9087] hover:text-[#f4eadc] md:inline-block"
            >
              Xem bảng đầy đủ ↓
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-8 text-center">
              <p className="font-mono text-sm text-[#9a9087]">
                Chưa có model nào bật. Admin sẽ thêm sớm.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((row) => (
                <div
                  key={row.model}
                  className="group relative overflow-hidden rounded-xl border border-white/8 bg-[#0c0a08] p-5 transition hover:border-[#ef4444]/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#dff8e4]">
                      {row.tag}
                    </span>
                    <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#5d544a]">
                      {row.provider}
                    </span>
                  </div>
                  <div className="mt-3 font-mono text-[0.95rem] text-[#f4eadc]">{row.model}</div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#5d544a]">
                        Input/M
                      </div>
                      <div className="mt-0.5 font-medium">{row.input.usd}</div>
                      <div className="text-[0.65rem] text-[#5d544a]">{row.input.vnd}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#5d544a]">
                        Output/M
                      </div>
                      <div className="mt-0.5 font-medium">{row.output.usd}</div>
                      <div className="text-[0.65rem] text-[#5d544a]">{row.output.vnd}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FULL PRICING TABLE */}
      <section id="full-pricing" className="border-b border-white/8">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="mb-6">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#9a9087]">
              Bảng giá đầy đủ
            </p>
            <h2 className="mt-1 text-3xl font-semibold">Tất cả model · giá đã cộng markup</h2>
            <p className="mt-2 text-sm text-[#9a9087]">
              Cập nhật tự động từ admin · cache 5 phút. Đăng nhập để xem usage realtime.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0c0a08]">
            <table className="w-full text-sm">
              <thead className="bg-[#120c09] text-[0.6rem] uppercase tracking-[0.18em] text-[#5d544a]">
                <tr>
                  <th className="px-4 py-3 text-left">Tag</th>
                  <th className="px-4 py-3 text-left">Model</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-right">Input / 1M</th>
                  <th className="px-4 py-3 text-right">Output / 1M</th>
                </tr>
              </thead>
              <tbody>
                {tiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center font-mono text-xs text-[#5d544a]">
                      Chưa có model nào được bật.
                    </td>
                  </tr>
                ) : (
                  tiers.map((row) => (
                    <tr key={row.model} className="border-t border-white/5 transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#dff8e4]">
                          {row.tag}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[0.85rem]">{row.model}</td>
                      <td className="px-4 py-3 font-mono text-[0.7rem] text-[#9a9087]">
                        {row.provider}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>{row.input.usd}</div>
                        <div className="text-[0.7rem] text-[#5d544a]">{row.input.vnd}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>{row.output.usd}</div>
                        <div className="text-[0.7rem] text-[#5d544a]">{row.output.vnd}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FEATURES grid */}
      <section className="border-b border-white/8">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="mb-8">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#9a9087]">
              Vì sao chọn MrNine
            </p>
            <h2 className="mt-1 text-3xl font-semibold">Built for VN devs</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Feature
              title="Thanh toán VietQR"
              desc="Quét QR app banking VN, không cần thẻ visa. Số dư cộng tự động qua SePay webhook trong 5–30 giây. Min 50.000đ."
            />
            <Feature
              title="Hỗ trợ Codex CLI"
              desc="Wire api responses native. config.toml 4 dòng là chạy. Stream SSE, function calling, tools — đầy đủ."
            />
            <Feature
              title="Failover OpenRouter"
              desc="Aiyan trả 5xx/429 → tự retry qua OpenRouter cùng model. Không downtime, không tay."
            />
            <Feature
              title="Spend limit per key"
              desc="Đặt monthly cap mỗi API key. Vượt → tự khoá. Reset ngày 1 hằng tháng. Không lo bill xài lậm."
            />
            <Feature
              title="Webhook events"
              desc="POST tới URL của bạn khi topup, balance thấp, refund, coupon redeem. HMAC SHA256, retry queue 3 lần."
            />
            <Feature
              title="Admin & audit"
              desc="2FA TOTP, audit log insert-only, refund button, coupon CRUD, model pricing UI. Đầy đủ tooling."
            />
          </div>
        </div>
      </section>

      {/* FAQ + CTA */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="grid gap-6 md:grid-cols-3">
            <FaqCard
              title="Refund?"
              desc="Không hoàn cho usage đã tiêu. Hoàn nếu provider lỗi 5xx hoặc bị suspend bất ngờ."
            />
            <FaqCard
              title="Hoá đơn VAT?"
              desc="Liên hệ admin nếu cần xuất hoá đơn doanh nghiệp."
            />
            <FaqCard
              title="Volume / partner?"
              desc={
                <>
                  Báo giá riêng cho team. Email{" "}
                  <a href="mailto:hello@mrnine.net" className="text-[#ef4444]">
                    hello@mrnine.net
                  </a>
                  .
                </>
              }
            />
          </div>

          <div className="mt-16 rounded-2xl border border-[#ef4444]/30 bg-gradient-to-br from-[#ef4444]/10 to-transparent p-10 text-center">
            <h3 className="text-2xl font-semibold md:text-3xl">Sẵn sàng tích hợp?</h3>
            <p className="mt-2 text-sm text-[#c8bdaf]">
              Đăng ký 30 giây · nhận $0.5 free · không cần thẻ.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-lg bg-[#ef4444] px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#090807] transition hover:bg-[#dc2626]"
              >
                Đăng ký →
              </Link>
              <Link
                href="/api-docs"
                className="rounded-lg border border-white/15 bg-white/5 px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#c8bdaf] transition hover:border-white/40 hover:text-[#f4eadc]"
              >
                Đọc docs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] px-4 py-3">
      <div className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#5d544a]">{label}</div>
      <div className={`mt-1 text-base font-medium ${mono ? "font-mono text-[#dff8e4]" : ""}`}>{value}</div>
    </div>
  );
}

function CodeCard({ title, language, code }: { title: string; language: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0c0a08]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">
          {title}
        </span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#5d544a]">
          {language}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.78rem] leading-relaxed text-[#dff8e4]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-5 transition hover:border-white/20">
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#dff8e4]">
        {title}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#c8bdaf]">{desc}</p>
    </div>
  );
}

function FaqCard({ title, desc }: { title: string; desc: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-5">
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#dff8e4]">
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#c8bdaf]">{desc}</p>
    </div>
  );
}
