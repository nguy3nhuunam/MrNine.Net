import Link from "next/link";

import { db } from "@/lib/pg/db";
import { modelMap } from "@/lib/pg/schema";
import { eq, asc } from "drizzle-orm";

export const metadata = {
  title: "API docs · MrNine",
  description: "Hướng dẫn dùng API gateway OpenAI-compatible của MrNine — Codex CLI, OpenAI SDK, curl, streaming SSE.",
};

export const revalidate = 3600;

const GATEWAY_OPENAPI_URL =
  process.env.GATEWAY_OPENAPI_URL ?? "https://api.mrnine.net/_openapi.json";

type EndpointRow = {
  method: string;
  path: string;
  summary: string;
};

async function loadEndpoints(): Promise<EndpointRow[] | null> {
  try {
    const res = await fetch(GATEWAY_OPENAPI_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const spec = (await res.json()) as {
      paths?: Record<string, Record<string, { summary?: string; description?: string }>>;
    };
    if (!spec.paths) return null;
    const rows: EndpointRow[] = [];
    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        rows.push({
          method: method.toUpperCase(),
          path,
          summary: op.summary ?? op.description ?? "",
        });
      }
    }
    return rows.sort((a, b) => a.path.localeCompare(b.path));
  } catch {
    return null;
  }
}

export default async function ApiDocsPage() {
  const [liveEndpoints, models] = await Promise.all([
    loadEndpoints(),
    db
      .select({ name: modelMap.publicName, provider: modelMap.provider })
      .from(modelMap)
      .where(eq(modelMap.enabled, true))
      .orderBy(asc(modelMap.publicName)),
  ]);

  return (
    <main className="min-h-screen bg-[#090807] text-[#f4eadc]">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/" className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[#9a9087]">
          ← mrnine.net
        </Link>
        <h1 className="mt-3 text-4xl font-semibold">API Gateway docs</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#c8bdaf]">
          OpenAI-compatible. Endpoint:{" "}
          <code className="rounded bg-[#120c09] px-1.5 py-0.5 text-[0.78rem] text-[#dff8e4]">
            https://api.mrnine.net/v1
          </code>
          . Key dạng <code className="text-[#dff8e4]">sk-mrnine-*</code>, tạo trong{" "}
          <Link href="/dashboard/api-keys" className="text-[#ef4444]">
            Dashboard
          </Link>
          .
        </p>

        <Section title="Endpoints">
          {liveEndpoints && liveEndpoints.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-white/8">
              <table className="w-full text-sm">
                <thead className="bg-[#120c09] text-[0.6rem] uppercase tracking-[0.16em] text-[#5d544a]">
                  <tr>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-left">Path</th>
                    <th className="px-3 py-2 text-left">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {liveEndpoints.map((e) => (
                    <tr key={`${e.method}-${e.path}`} className="border-t border-white/5">
                      <td className="px-3 py-2">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] " +
                            (e.method === "GET"
                              ? "bg-[#45a85d]/15 text-[#dff8e4]"
                              : "bg-[#d6a548]/15 text-[#d6a548]")
                          }
                        >
                          {e.method}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">{e.path}</td>
                      <td className="px-3 py-2 text-[0.78rem] text-[#9a9087]">{e.summary || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-white/5 bg-[#0c0a08] px-3 py-2 font-mono text-[0.6rem] text-[#5d544a]">
                Live từ {GATEWAY_OPENAPI_URL} · cache 1h
              </p>
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-[#c8bdaf]">
              <li>
                <code className="text-[#dff8e4]">POST /v1/responses</code> — chuẩn mới, dùng bởi Codex CLI (
                <code className="text-[#9a9087]">wire_api = &quot;responses&quot;</code>).
              </li>
              <li>
                <code className="text-[#dff8e4]">POST /v1/chat/completions</code> — OpenAI SDK / Cursor / Claude
                Code / mọi client OpenAI cũ. Hỗ trợ <code>stream=true</code>.
              </li>
              <li>
                <code className="text-[#dff8e4]">GET /v1/models</code> — list model active.
              </li>
              <li>
                <code className="text-[#dff8e4]">GET /v1/usage/me</code> — balance + usage 30 ngày.
              </li>
              <li>
                <code className="text-[#dff8e4]">GET /health</code> — public, không cần auth.
              </li>
            </ul>
          )}
        </Section>

        <Section title={`Models đang bật (${models.length})`}>
          {models.length === 0 ? (
            <p className="text-sm text-[#5d544a]">Chưa có model nào được bật.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {models.map((m) => (
                <code
                  key={m.name}
                  className="rounded-md border border-white/10 bg-[#120c09] px-2 py-1 font-mono text-[0.75rem] text-[#dff8e4]"
                  title={m.provider}
                >
                  {m.name}
                </code>
              ))}
            </div>
          )}
        </Section>

        <Section title="curl — chat completions stream">
          <CodeBlock
            language="bash"
            code={`curl -N https://api.mrnine.net/v1/chat/completions \\
  -H "Authorization: Bearer sk-mrnine-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.4",
    "messages": [{"role":"user","content":"đếm từ 1 đến 5"}],
    "stream": true
  }'`}
          />
        </Section>

        <Section title="Python — OpenAI SDK">
          <CodeBlock
            language="python"
            code={`from openai import OpenAI

client = OpenAI(
    base_url="https://api.mrnine.net/v1",
    api_key="sk-mrnine-...",
)

# Chat
r = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "hi"}],
    stream=True,
)
for chunk in r:
    print(chunk.choices[0].delta.content or "", end="")

# Responses (mới — multi-turn server-side)
r = client.responses.create(model="gpt-5.4", input="hi")
print(r.output_text)`}
          />
        </Section>

        <Section title="Codex CLI">
          <p className="mb-2 text-sm text-[#c8bdaf]">
            Sửa <code className="text-[#dff8e4]">~/.codex/config.toml</code>:
          </p>
          <CodeBlock
            language="toml"
            code={`model_provider = "MrNine"
model = "gpt-5.4"
review_model = "gpt-5.4"
model_reasoning_effort = "xhigh"
model_context_window = 1000000

[model_providers.MrNine]
name = "MrNine"
base_url = "https://api.mrnine.net"
wire_api = "responses"
requires_openai_auth = true`}
          />
          <p className="mt-3 text-sm text-[#c8bdaf]">Set env trước khi chạy:</p>
          <CodeBlock language="bash" code="export OPENAI_API_KEY=sk-mrnine-..." />
        </Section>

        <Section title="Cursor / Claude Code / SDK khác">
          <p className="text-sm text-[#c8bdaf]">
            Mọi client OpenAI-compatible đều dùng được — chỉ cần cấu hình:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#c8bdaf]">
            <li>Base URL: <code className="text-[#dff8e4]">https://api.mrnine.net/v1</code></li>
            <li>API key: <code className="text-[#dff8e4]">sk-mrnine-*</code> của bạn</li>
            <li>Model: lấy từ <code>/v1/models</code> hoặc trang Dashboard</li>
          </ul>
        </Section>

        <Section title="Function calling (tools)">
          <p className="text-sm text-[#c8bdaf]">
            Pass-through hoàn toàn — gateway forward field <code className="text-[#dff8e4]">tools</code>{" "}
            và <code className="text-[#dff8e4]">tool_choice</code> sang upstream. Phía model trả{" "}
            <code className="text-[#dff8e4]">tool_calls</code>, bạn execute tool và gửi role
            <code className="text-[#dff8e4]">tool</code> message kèm <code>tool_call_id</code>.
          </p>
          <CodeBlock
            language="python"
            code={`from openai import OpenAI
import json

client = OpenAI(base_url="https://api.mrnine.net/v1", api_key="sk-mrnine-...")

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Lấy thời tiết hiện tại theo thành phố",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"},
                "unit": {"type": "string", "enum": ["c", "f"], "default": "c"},
            },
            "required": ["city"],
        },
    },
}]

messages = [{"role": "user", "content": "Trời Hà Nội hôm nay thế nào?"}]
r = client.chat.completions.create(model="gpt-5.4", messages=messages, tools=tools)
msg = r.choices[0].message
messages.append(msg)

if msg.tool_calls:
    for tc in msg.tool_calls:
        args = json.loads(tc.function.arguments)
        result = lookup_weather(args["city"])  # bạn tự implement
        messages.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": json.dumps(result),
        })
    r2 = client.chat.completions.create(model="gpt-5.4", messages=messages, tools=tools)
    print(r2.choices[0].message.content)`}
          />
          <p className="mt-3 text-sm text-[#c8bdaf]">
            <code className="text-[#dff8e4]">tool_choice</code> có thể là{" "}
            <code>"auto"</code>, <code>"required"</code>, <code>"none"</code>, hoặc{" "}
            <code>{`{"type":"function","function":{"name":"..."}}`}</code> để ép gọi tool cụ thể.
          </p>
        </Section>

        <Section title="Embeddings">
          <CodeBlock
            language="python"
            code={`r = client.embeddings.create(
    model="text-embedding-3-small",
    input=["Hello", "Xin chào"],
)
for d in r.data:
    print(d.index, len(d.embedding))`}
          />
        </Section>

        <Section title="Audio transcription">
          <CodeBlock
            language="python"
            code={`with open("audio.mp3", "rb") as f:
    r = client.audio.transcriptions.create(
        model="whisper-1",
        file=f,
        language="vi",
    )
print(r.text)`}
          />
        </Section>

        <Section title="Image generation">
          <CodeBlock
            language="python"
            code={`r = client.images.generate(
    model="dall-e-3",
    prompt="A red panda coding at a desk, studio ghibli style",
    size="1024x1024",
    n=1,
)
print(r.data[0].url)`}
          />
        </Section>

        <Section title="Image edit (inpainting)">
          <CodeBlock
            language="python"
            code={`r = client.images.edit(
    model="dall-e-2",
    image=open("input.png", "rb"),
    mask=open("mask.png", "rb"),
    prompt="Replace masked area with a sunflower field",
    n=1,
    size="1024x1024",
)
print(r.data[0].url)`}
          />
        </Section>

        <Section title="Image variations">
          <CodeBlock
            language="python"
            code={`r = client.images.create_variation(
    model="dall-e-2",
    image=open("input.png", "rb"),
    n=2,
    size="1024x1024",
)
for d in r.data:
    print(d.url)`}
          />
        </Section>

        <Section title="Moderation (free)">
          <CodeBlock
            language="python"
            code={`r = client.moderations.create(
    model="omni-moderation-latest",
    input="Some text to check",
)
print(r.results[0].flagged, r.results[0].categories)`}
          />
        </Section>

        <Section title="Rerank (Cohere/Jina format)">
          <CodeBlock
            language="bash"
            code={`curl https://api.mrnine.net/v1/rerank \\
  -H "Authorization: Bearer sk-mrnine-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "rerank-multilingual-v3",
    "query": "AI gateway giá rẻ",
    "documents": [
      "MrNine bán API key OpenAI compatible",
      "Hôm nay trời mưa",
      "VietQR thanh toán nhanh"
    ],
    "top_n": 2
  }'`}
          />
        </Section>

        <Section title="Text-to-speech">
          <CodeBlock
            language="python"
            code={`r = client.audio.speech.create(
    model="tts-1",
    voice="alloy",
    input="Xin chào, tôi là MrNine.",
)
r.stream_to_file("hello.mp3")`}
          />
        </Section>

        <Section title="Batch API (50% rẻ hơn)">
          <p className="text-sm text-[#c8bdaf]">
            Upload .jsonl input → tạo batch → poll status → download output. Hoàn thành trong 24h, giá rẻ ~50%.
          </p>
          <CodeBlock
            language="python"
            code={`# 1. Upload input
f = client.files.create(
    file=open("requests.jsonl", "rb"),
    purpose="batch",
)

# 2. Tạo batch
batch = client.batches.create(
    input_file_id=f.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",
)
print(batch.id, batch.status)

# 3. Poll status
batch = client.batches.retrieve(batch.id)
if batch.status == "completed":
    out = client.files.content(batch.output_file_id)
    print(out.text)`}
          />
        </Section>

        <Section title="Rate limit & quota">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#c8bdaf]">
            <li>Default RPM = 60 / phút, TPM = 200K tokens / phút mỗi key.</li>
            <li>Daily token cap = 1M tokens / key (admin tăng theo nhu cầu).</li>
            <li>Vượt → 429 + body OpenAI-style error.</li>
            <li>Hết balance → 402 Payment Required, kèm link tới{" "}
              <Link href="/dashboard/billing" className="text-[#ef4444]">
                trang nạp
              </Link>.
            </li>
          </ul>
        </Section>

        <Section title="Headers ghi log">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#c8bdaf]">
            <li>
              <code className="text-[#dff8e4]">X-MrNine-Request-Id</code> — request id (mỗi request) để tra log
              khi hỗ trợ.
            </li>
            <li><code>X-Accel-Buffering: no</code> — server-side, đảm bảo SSE không buffer qua reverse proxy.</li>
          </ul>
        </Section>

        <Section title="Error format">
          <CodeBlock
            language="json"
            code={`{
  "error": {
    "message": "Insufficient balance. Please top up at https://mrnine.net/dashboard/billing",
    "type": "insufficient_balance",
    "code": "balance_required"
  }
}`}
          />
        </Section>

        <Section title="Hỗ trợ">
          <p className="text-sm text-[#c8bdaf]">
            Hỏi nhanh:{" "}
            <a href="mailto:hello@mrnine.net" className="text-[#ef4444]">
              hello@mrnine.net
            </a>
            . Khi báo lỗi, kèm <code className="text-[#dff8e4]">X-MrNine-Request-Id</code> để tra cứu.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/api/openapi.json"
              className="rounded-md border border-white/10 bg-[#120c09] px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#dff8e4] hover:border-white/30"
              download
            >
              ↓ OpenAPI 3.1 spec
            </a>
            <a
              href="/api/postman.json"
              className="rounded-md border border-[#d6a548]/40 bg-[#d6a548]/10 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#d6a548] hover:bg-[#d6a548]/20"
              download
            >
              ↓ Postman collection v2.1
            </a>
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#dff8e4]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/8 bg-[#0c0a08] p-4 text-[0.78rem] leading-relaxed text-[#dff8e4]">
      <span className="block font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#5d544a]">{language}</span>
      <code>{code}</code>
    </pre>
  );
}
