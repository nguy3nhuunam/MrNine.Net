import Link from "next/link";

export const metadata = {
  title: "API docs · MrNine",
  description: "Hướng dẫn dùng API gateway OpenAI-compatible của MrNine — Codex CLI, OpenAI SDK, curl, streaming SSE.",
};

export default function ApiDocsPage() {
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
          <ul className="space-y-2 text-sm text-[#c8bdaf]">
            <li>
              <code className="text-[#dff8e4]">POST /v1/responses</code> — chuẩn mới, dùng bởi Codex CLI (
              <code className="text-[#9a9087]">wire_api = "responses"</code>).
            </li>
            <li>
              <code className="text-[#dff8e4]">POST /v1/chat/completions</code> — OpenAI SDK / Cursor / Claude
              Code / mọi client OpenAI cũ. Hỗ trợ <code>stream=true</code>.
            </li>
            <li>
              <code className="text-[#dff8e4]">GET /v1/models</code> — list model active.
            </li>
            <li>
              <code className="text-[#dff8e4]">GET /health</code> — public, không cần auth.
            </li>
          </ul>
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
