"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  AlignLeft,
  Binary,
  Braces,
  CalendarClock,
  CaseSensitive,
  Clock,
  Code as CodeIcon,
  Contrast,
  Copy,
  Dices,
  FileText,
  GitCompare,
  Hash,
  KeyRound,
  Link2,
  Lock,
  Palette,
  Regex,
  Sigma,
  TextCursorInput,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type ToolId =
  | "json" | "regex" | "base64" | "url" | "jwt" | "hash" | "color" | "timestamp"
  | "uuid" | "password" | "lorem" | "slug"
  | "diff" | "count" | "markdown" | "case"
  | "cron" | "html" | "numbase" | "contrast";

type ToolGroup = "encode" | "generate" | "text" | "code" | "time";

const tools: ReadonlyArray<{
  id: ToolId;
  group: ToolGroup;
  icon: typeof Wrench;
  titleVi: string;
  titleEn: string;
  hintVi: string;
  hintEn: string;
}> = [
  { id: "json", group: "encode", icon: Braces, titleVi: "JSON", titleEn: "JSON", hintVi: "Format · validate · minify", hintEn: "Format · validate · minify" },
  { id: "regex", group: "code", icon: Regex, titleVi: "Regex", titleEn: "Regex", hintVi: "Test biểu thức + highlight", hintEn: "Test patterns + highlight" },
  { id: "base64", group: "encode", icon: Binary, titleVi: "Base64", titleEn: "Base64", hintVi: "Mã hoá / giải mã", hintEn: "Encode / decode" },
  { id: "url", group: "encode", icon: Link2, titleVi: "URL", titleEn: "URL", hintVi: "encode / decode URI", hintEn: "encode / decode URI" },
  { id: "html", group: "encode", icon: CodeIcon, titleVi: "HTML entities", titleEn: "HTML entities", hintVi: "&amp; · &lt; · &nbsp;", hintEn: "&amp; · &lt; · &nbsp;" },
  { id: "jwt", group: "encode", icon: KeyRound, titleVi: "JWT", titleEn: "JWT", hintVi: "Giải mã header + payload", hintEn: "Decode header + payload" },
  { id: "hash", group: "encode", icon: Hash, titleVi: "Hash", titleEn: "Hash", hintVi: "SHA-1, SHA-256, SHA-512", hintEn: "SHA-1, SHA-256, SHA-512" },
  { id: "uuid", group: "generate", icon: Dices, titleVi: "UUID / ULID", titleEn: "UUID / ULID", hintVi: "v4 + ULID · sinh hàng loạt", hintEn: "v4 + ULID · batch" },
  { id: "password", group: "generate", icon: Lock, titleVi: "Mật khẩu", titleEn: "Password", hintVi: "Sinh mật khẩu mạnh", hintEn: "Strong password gen" },
  { id: "lorem", group: "generate", icon: AlignLeft, titleVi: "Lorem ipsum", titleEn: "Lorem ipsum", hintVi: "Văn bản giả VN/EN", hintEn: "Filler text VN/EN" },
  { id: "slug", group: "generate", icon: TextCursorInput, titleVi: "Slug", titleEn: "Slug", hintVi: "Bỏ dấu · kebab-case", hintEn: "Diacritic-strip · kebab" },
  { id: "diff", group: "text", icon: GitCompare, titleVi: "Diff", titleEn: "Diff", hintVi: "So sánh 2 đoạn text", hintEn: "Compare two strings" },
  { id: "count", group: "text", icon: Sigma, titleVi: "Word count", titleEn: "Word count", hintVi: "Word · char · byte · read time", hintEn: "Word · char · byte · read time" },
  { id: "markdown", group: "text", icon: FileText, titleVi: "Markdown", titleEn: "Markdown", hintVi: "Preview live", hintEn: "Live preview" },
  { id: "case", group: "text", icon: CaseSensitive, titleVi: "Đổi case", titleEn: "Case convert", hintVi: "camel · snake · kebab · ...", hintEn: "camel · snake · kebab · ..." },
  { id: "cron", group: "code", icon: CalendarClock, titleVi: "Cron", titleEn: "Cron", hintVi: "Giải nghĩa + lần chạy kế", hintEn: "Explain + next runs" },
  { id: "numbase", group: "code", icon: Binary, titleVi: "Number base", titleEn: "Number base", hintVi: "bin · oct · dec · hex", hintEn: "bin · oct · dec · hex" },
  { id: "color", group: "code", icon: Palette, titleVi: "Color", titleEn: "Color", hintVi: "HEX ↔ RGB ↔ HSL", hintEn: "HEX ↔ RGB ↔ HSL" },
  { id: "contrast", group: "code", icon: Contrast, titleVi: "Contrast WCAG", titleEn: "Contrast WCAG", hintVi: "AA / AAA cho text", hintEn: "AA / AAA for text" },
  { id: "timestamp", group: "time", icon: Clock, titleVi: "Timestamp", titleEn: "Timestamp", hintVi: "Unix ↔ ISO ↔ Vietnam", hintEn: "Unix ↔ ISO ↔ Vietnam" },
];

const groupLabels: Record<ToolGroup, { vi: string; en: string }> = {
  encode: { vi: "Mã hoá / Giải mã", en: "Encode / Decode" },
  generate: { vi: "Sinh dữ liệu", en: "Generators" },
  text: { vi: "Văn bản", en: "Text" },
  code: { vi: "Code & Design", en: "Code & Design" },
  time: { vi: "Thời gian", en: "Time" },
};

export function ToolsShell() {
  const { language } = useLanguage();
  const [active, setActive] = useState<ToolId>("json");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#060b0d] text-[#dff3f6]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, rgba(71,201,217,0.22), transparent 32%), radial-gradient(circle at 86% 18%, rgba(69,168,93,0.1), transparent 28%), radial-gradient(circle at 50% 92%, rgba(167,139,250,0.06), transparent 32%), linear-gradient(180deg, #061014 0%, #030607 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:24px_24px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(71,201,217,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(71,201,217,0.045) 1px, transparent 1px)",
        }}
      />
      <div className="blueprint-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#12323a] bg-[#050d10]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={language === "vi" ? "Quay lại trang chủ" : "Back to home"}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#47c9d9]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#47c9d9]/70 sm:text-2xl"
        >
          Mr<span className="text-[#47c9d9]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#47c9d9]/30 bg-[#47c9d9]/10 text-[#47c9d9]">
            <Wrench className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#79ddeb]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">Tools</h1>
          </div>
        </div>
      </header>

      <section className="relative z-10 w-full px-4 pb-12 pt-5 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="border-b border-[#12323a] pb-5 sm:pb-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
            {language === "vi" ? "Trang chủ" : "Home"}
            <span className="mx-2 text-[#5e574e]">/</span>
            {language === "vi" ? "Hộp công cụ dev" : "Dev toolkit"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "json · regex · base64 · jwt · hash" : "json · regex · base64 · jwt · hash"}
          </h2>
          <p className="mt-3 max-w-3xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "Bộ tiện ích dev hằng ngày, chạy hoàn toàn trên trình duyệt. Dữ liệu của bạn không gửi lên server."
              : "Daily dev utilities, fully client-side. Your data never leaves the browser."}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {(Object.keys(groupLabels) as ToolGroup[]).map((group) => {
            const groupTools = tools.filter((t) => t.group === group);
            if (groupTools.length === 0) return null;
            return (
              <div key={group}>
                <p className="mb-1.5 font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[#5e7a82]">
                  {language === "vi" ? groupLabels[group].vi : groupLabels[group].en}
                  <span className="ml-2 text-[#3f6068]">{groupTools.length}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
                  {groupTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = active === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setActive(tool.id)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition",
                          isActive
                            ? "border-[#47c9d9]/65 bg-[#06181c]/82 text-[#a8e8f0]"
                            : "border-[#12323a] bg-[#050d10]/70 text-[#79ddeb] hover:border-[#47c9d9]/40 hover:text-[#dff3f6]",
                        )}
                      >
                        <div className={cn(
                          "flex size-8 items-center justify-center rounded-md border",
                          isActive ? "border-[#47c9d9]/65 bg-[#47c9d9]/14" : "border-[#47c9d9]/22 bg-[#47c9d9]/8",
                        )}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.85rem] font-bold text-[#f4eadc]">{language === "vi" ? tool.titleVi : tool.titleEn}</div>
                          <div className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#5e574e]">
                            {language === "vi" ? tool.hintVi : tool.hintEn}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          {active === "json" ? <JsonTool language={language} /> : null}
          {active === "regex" ? <RegexTool language={language} /> : null}
          {active === "base64" ? <Base64Tool language={language} /> : null}
          {active === "url" ? <UrlTool language={language} /> : null}
          {active === "html" ? <HtmlTool language={language} /> : null}
          {active === "jwt" ? <JwtTool language={language} /> : null}
          {active === "hash" ? <HashTool language={language} /> : null}
          {active === "uuid" ? <UuidTool language={language} /> : null}
          {active === "password" ? <PasswordTool language={language} /> : null}
          {active === "lorem" ? <LoremTool language={language} /> : null}
          {active === "slug" ? <SlugTool language={language} /> : null}
          {active === "diff" ? <DiffTool language={language} /> : null}
          {active === "count" ? <CountTool language={language} /> : null}
          {active === "markdown" ? <MarkdownTool language={language} /> : null}
          {active === "case" ? <CaseTool language={language} /> : null}
          {active === "cron" ? <CronTool language={language} /> : null}
          {active === "numbase" ? <NumBaseTool language={language} /> : null}
          {active === "color" ? <ColorTool language={language} /> : null}
          {active === "contrast" ? <ContrastTool language={language} /> : null}
          {active === "timestamp" ? <TimestampTool language={language} /> : null}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-[#12323a] bg-[#050d10]/72 p-4">
      <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#79ddeb]">
        <span className="size-1.5 rounded-full bg-[#47c9d9]" />
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CopyButton({ value, label = "Copy" }: Readonly<{ value: string; label?: string }>) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          // ignore
        }
      }}
      className="flex h-7 items-center gap-1.5 rounded-md border border-[#47c9d9]/30 bg-[#06181c]/72 px-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/65"
    >
      <Copy className="size-3" />
      {copied ? "Copied" : label}
    </button>
  );
}

function TextArea({ value, onChange, placeholder, mono = true }: Readonly<{ value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }>) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        "min-h-32 w-full resize-y rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 text-[0.82rem] text-[#dff3f6] outline-none placeholder:text-[#3f6068] focus:border-[#47c9d9]/55",
        mono && "font-mono",
      )}
    />
  );
}

function JsonTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [input, setInput] = useState('{"name":"MrNine","modules":12,"alive":true}');
  const [pretty, setPretty] = useState(true);
  const result = useMemo(() => {
    if (!input.trim()) return { ok: true, value: "" };
    try {
      const parsed = JSON.parse(input);
      return { ok: true, value: JSON.stringify(parsed, null, pretty ? 2 : 0) };
    } catch (err) {
      return { ok: false, value: err instanceof Error ? err.message : String(err) };
    }
  }, [input, pretty]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đầu vào" : "Input"}>
        <TextArea value={input} onChange={setInput} placeholder='{"key":"value"}' />
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPretty((c) => !c)}
            className="rounded-md border border-[#47c9d9]/30 bg-[#06181c]/72 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/65"
          >
            {pretty ? "Pretty (2)" : "Minified"}
          </button>
          <button
            type="button"
            onClick={() => setInput("")}
            className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb] transition hover:border-white/30"
          >
            Clear
          </button>
        </div>
      </Panel>
      <Panel title={result.ok ? (language === "vi" ? "Kết quả" : "Output") : "Error"}>
        {result.ok ? (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[#12323a] bg-[#040a0c] p-3 font-mono text-[0.78rem] text-[#dff3f6]">{result.value || "—"}</pre>
        ) : (
          <pre className="rounded-md border border-[#ef4444]/40 bg-[#1a0606] p-3 font-mono text-[0.78rem] text-[#ffb4ad]">{result.value}</pre>
        )}
        {result.ok && result.value ? (
          <div className="mt-2"><CopyButton value={result.value} /></div>
        ) : null}
      </Panel>
    </div>
  );
}

function RegexTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [pattern, setPattern] = useState("\\b\\w{4,}\\b");
  const [flags, setFlags] = useState("gi");
  const [text, setText] = useState("MrNine ships AI Playground, Photo Fix and Story Writer for everyone.");

  const result = useMemo(() => {
    if (!pattern) return { ok: true, matches: [] as string[], error: "" };
    try {
      const re = new RegExp(pattern, flags);
      const matches = text.match(re) ?? [];
      return { ok: true, matches, error: "" };
    } catch (err) {
      return { ok: false, matches: [] as string[], error: err instanceof Error ? err.message : String(err) };
    }
  }, [pattern, flags, text]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Regex">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.78rem] text-[#79ddeb]">/</span>
          <input
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[0.82rem] text-[#dff3f6] outline-none placeholder:text-[#3f6068] focus:border-[#47c9d9]/55"
            placeholder="\\d{3}"
          />
          <span className="font-mono text-[0.78rem] text-[#79ddeb]">/</span>
          <input
            value={flags}
            onChange={(event) => setFlags(event.target.value.replace(/[^gimsuy]/g, ""))}
            className="w-20 rounded-md border border-[#12323a] bg-[#040a0c] px-2 py-2 font-mono text-[0.82rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
            placeholder="gi"
          />
        </div>
        <div className="mt-3">
          <TextArea value={text} onChange={setText} placeholder={language === "vi" ? "Văn bản cần test" : "Text to test"} />
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Khớp" : "Matches"}>
        {result.ok ? (
          result.matches.length === 0 ? (
            <p className="text-[0.78rem] text-[#79ddeb]">{language === "vi" ? "Không có khớp." : "No match."}</p>
          ) : (
            <div className="space-y-1.5">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">
                {result.matches.length} {language === "vi" ? "khớp" : "matches"}
              </p>
              <div className="flex max-h-72 flex-wrap gap-1.5 overflow-auto">
                {result.matches.map((match, idx) => (
                  <span key={`${match}-${idx}`} className="rounded-md border border-[#47c9d9]/35 bg-[#47c9d9]/12 px-2 py-1 font-mono text-[0.7rem] text-[#a8e8f0]">
                    {match}
                  </span>
                ))}
              </div>
            </div>
          )
        ) : (
          <pre className="rounded-md border border-[#ef4444]/40 bg-[#1a0606] p-3 font-mono text-[0.78rem] text-[#ffb4ad]">{result.error}</pre>
        )}
      </Panel>
    </div>
  );
}

function Base64Tool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [plain, setPlain] = useState("MrNine 2026");
  const [encoded, setEncoded] = useState("");

  useEffect(() => {
    try {
      const bytes = new TextEncoder().encode(plain);
      let binary = "";
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      setEncoded(btoa(binary));
    } catch {
      setEncoded("");
    }
  }, [plain]);

  const decode = (value: string) => {
    try {
      const binary = atob(value.trim());
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      setPlain(new TextDecoder().decode(bytes));
    } catch {
      setPlain(language === "vi" ? "Base64 không hợp lệ" : "Invalid base64");
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Văn bản" : "Plain"}>
        <TextArea value={plain} onChange={setPlain} placeholder={language === "vi" ? "Nhập văn bản" : "Enter text"} />
        <div className="mt-2"><CopyButton value={plain} /></div>
      </Panel>
      <Panel title="Base64">
        <TextArea value={encoded} onChange={(value) => { setEncoded(value); decode(value); }} placeholder="ZW5jb2RlZA==" />
        <div className="mt-2"><CopyButton value={encoded} /></div>
      </Panel>
    </div>
  );
}

function UrlTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [plain, setPlain] = useState("https://mrnine.net/markets?type=crypto&top=10&note=hello world");
  const [encoded, setEncoded] = useState("");

  useEffect(() => {
    try { setEncoded(encodeURIComponent(plain)); } catch { setEncoded(""); }
  }, [plain]);

  const decode = (value: string) => {
    try { setPlain(decodeURIComponent(value)); } catch { setPlain(language === "vi" ? "Không decode được" : "Cannot decode"); }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Văn bản" : "Plain"}>
        <TextArea value={plain} onChange={setPlain} />
        <div className="mt-2"><CopyButton value={plain} /></div>
      </Panel>
      <Panel title="URL encoded">
        <TextArea value={encoded} onChange={(value) => { setEncoded(value); decode(value); }} />
        <div className="mt-2"><CopyButton value={encoded} /></div>
      </Panel>
    </div>
  );
}

function JwtTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik1yTmluZSIsImlhdCI6MTcwMDAwMDAwMH0.placeholder");

  const result = useMemo(() => {
    const parts = token.trim().split(".");
    if (parts.length < 2) return { ok: false, error: language === "vi" ? "JWT cần ít nhất 2 phần (header.payload)" : "JWT needs at least 2 parts (header.payload)" };
    try {
      const decode = (segment: string) => {
        const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
        const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
        const binary = atob(padded + padding);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
      };
      return {
        ok: true,
        header: decode(parts[0]),
        payload: decode(parts[1]),
        signature: parts[2] ?? "",
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [token, language]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="JWT">
        <TextArea value={token} onChange={setToken} placeholder="header.payload.signature" />
        <p className="mt-2 text-[0.7rem] text-[#79ddeb]">
          {language === "vi" ? "Decode chỉ ở client. Không kiểm tra chữ ký." : "Decoded client-side. Signature is not verified."}
        </p>
      </Panel>
      <Panel title={language === "vi" ? "Đã giải mã" : "Decoded"}>
        {result.ok ? (
          <div className="space-y-3">
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">Header</p>
              <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-[#12323a] bg-[#040a0c] p-2 font-mono text-[0.74rem] text-[#dff3f6]">{JSON.stringify(result.header, null, 2)}</pre>
            </div>
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">Payload</p>
              <pre className="mt-1 max-h-72 overflow-auto rounded-md border border-[#12323a] bg-[#040a0c] p-2 font-mono text-[0.74rem] text-[#dff3f6]">{JSON.stringify(result.payload, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <pre className="rounded-md border border-[#ef4444]/40 bg-[#1a0606] p-3 font-mono text-[0.78rem] text-[#ffb4ad]">{result.error}</pre>
        )}
      </Panel>
    </div>
  );
}

function HashTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [input, setInput] = useState("MrNine 2026");
  const [hashes, setHashes] = useState<{ sha1: string; sha256: string; sha512: string }>({ sha1: "", sha256: "", sha512: "" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      try {
        const [sha1, sha256, sha512] = await Promise.all([
          crypto.subtle.digest("SHA-1", data),
          crypto.subtle.digest("SHA-256", data),
          crypto.subtle.digest("SHA-512", data),
        ]);
        if (cancelled) return;
        setHashes({ sha1: toHex(sha1), sha256: toHex(sha256), sha512: toHex(sha512) });
      } catch {
        // crypto.subtle requires HTTPS — leave empty
      }
    })();
    return () => { cancelled = true; };
  }, [input]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đầu vào" : "Input"}>
        <TextArea value={input} onChange={setInput} />
      </Panel>
      <Panel title="Hash">
        <div className="space-y-3">
          {[
            { label: "SHA-1", value: hashes.sha1 },
            { label: "SHA-256", value: hashes.sha256 },
            { label: "SHA-512", value: hashes.sha512 },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">{row.label}</span>
                {row.value ? <CopyButton value={row.value} /> : null}
              </div>
              <p className="mt-1 break-all rounded-md border border-[#12323a] bg-[#040a0c] p-2 font-mono text-[0.7rem] text-[#dff3f6]">{row.value || "—"}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ColorTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [hex, setHex] = useState("#45a85d");

  const parsed = useMemo(() => {
    const clean = hex.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const [rN, gN, bN] = [r / 255, g / 255, b / 255];
    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
        case gN: h = (bN - rN) / d + 2; break;
        default: h = (rN - gN) / d + 4;
      }
      h *= 60;
    }
    return {
      r, g, b,
      hsl: { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) },
    };
  }, [hex]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="HEX">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={parsed ? hex : "#45a85d"}
            onChange={(event) => setHex(event.target.value)}
            className="size-16 cursor-pointer rounded-md border border-[#12323a] bg-transparent"
          />
          <input
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            className="flex-1 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[1rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
            placeholder="#45a85d"
          />
        </div>
        {!parsed ? (
          <p className="mt-2 text-[0.7rem] text-[#ffb4ad]">{language === "vi" ? "HEX không hợp lệ. Cần 6 ký tự." : "Invalid HEX. Need 6 characters."}</p>
        ) : null}
      </Panel>
      <Panel title={language === "vi" ? "Quy đổi" : "Conversions"}>
        {parsed ? (
          <div className="space-y-2">
            <Row label="RGB" value={`rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`} />
            <Row label="HSL" value={`hsl(${parsed.hsl.h}, ${parsed.hsl.s}%, ${parsed.hsl.l}%)`} />
            <Row label="Tailwind" value={`bg-[${hex}]`} />
            <Row label="CSS var" value={`--mrnine-color: ${hex};`} />
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">{label}</span>
      <code className="flex-1 truncate text-right font-mono text-[0.78rem] text-[#dff3f6]">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

function TimestampTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [unix, setUnix] = useState(() => Math.floor(Date.now() / 1000).toString());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const date = useMemo(() => {
    const num = Number(unix);
    if (!Number.isFinite(num)) return null;
    return new Date(num.toString().length <= 10 ? num * 1000 : num);
  }, [unix]);

  const valid = date && !Number.isNaN(date.getTime());

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Unix timestamp">
        <input
          value={unix}
          onChange={(event) => setUnix(event.target.value)}
          className="w-full rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[1rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setUnix(Math.floor(Date.now() / 1000).toString())}
            className="rounded-md border border-[#47c9d9]/35 bg-[#06181c]/72 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/65"
          >
            {language === "vi" ? "Hiện tại" : "Now"}
          </button>
          <span className="font-mono text-[0.62rem] text-[#5e574e]">
            {language === "vi" ? "Hiện tại Unix:" : "Now (s):"} {Math.floor(now / 1000)}
          </span>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Đã chuyển đổi" : "Converted"}>
        {valid ? (
          <div className="space-y-2">
            <Row label="ISO 8601" value={date.toISOString()} />
            <Row label="UTC" value={date.toUTCString()} />
            <Row label="Vietnam" value={date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} />
            <Row label="Bangkok" value={date.toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })} />
            <Row label="Relative" value={getRelative(date.getTime(), now, language)} />
          </div>
        ) : (
          <p className="text-[0.78rem] text-[#ffb4ad]">{language === "vi" ? "Timestamp không hợp lệ" : "Invalid timestamp"}</p>
        )}
      </Panel>
    </div>
  );
}

function getRelative(ts: number, now: number, language: "vi" | "en"): string {
  const diff = (now - ts) / 1000;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const units: Array<{ s: number; vi: string; en: string }> = [
    { s: 60, vi: "giây", en: "seconds" },
    { s: 3600, vi: "phút", en: "minutes" },
    { s: 86400, vi: "giờ", en: "hours" },
    { s: 86400 * 30, vi: "ngày", en: "days" },
    { s: 86400 * 365, vi: "tháng", en: "months" },
    { s: Infinity, vi: "năm", en: "years" },
  ];
  let value = abs;
  let label: { vi: string; en: string } = units[0];
  for (let i = 0; i < units.length - 1; i += 1) {
    if (abs < units[i].s) {
      label = units[i];
      value = i === 0 ? abs : abs / units[i - 1].s;
      break;
    }
  }
  if (abs >= units[units.length - 2].s) {
    label = units[units.length - 1];
    value = abs / units[units.length - 2].s;
  }
  const rounded = Math.round(value);
  if (language === "vi") {
    return future ? `trong ${rounded} ${label.vi} nữa` : `${rounded} ${label.vi} trước`;
  }
  return future ? `in ${rounded} ${label.en}` : `${rounded} ${label.en} ago`;
}

// =====================================================================
// Generators
// =====================================================================

function uuidV4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function ulid(): string {
  let time = Date.now();
  let timeChars = "";
  for (let i = 0; i < 10; i += 1) {
    timeChars = ULID_ALPHABET[time % 32] + timeChars;
    time = Math.floor(time / 32);
  }
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  let randomChars = "";
  for (let i = 0; i < 16; i += 1) randomChars += ULID_ALPHABET[random[i] % 32];
  return timeChars + randomChars;
}

function UuidTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [count, setCount] = useState(5);
  const [type, setType] = useState<"uuid" | "ulid">("uuid");
  const [items, setItems] = useState<string[]>([]);

  const generate = () => {
    const out: string[] = [];
    for (let i = 0; i < Math.max(1, Math.min(count, 200)); i += 1) {
      out.push(type === "uuid" ? uuidV4() : ulid());
    }
    setItems(out);
  };

  useEffect(() => { generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Cấu hình" : "Settings"}>
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(["uuid", "ulid"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setType(opt)}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  type === opt ? "border-[#47c9d9]/65 bg-[#47c9d9]/14 text-[#a8e8f0]" : "border-white/10 text-[#79ddeb] hover:border-[#47c9d9]/40",
                )}
              >
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#79ddeb]">
              {language === "vi" ? "Số lượng" : "Count"}
            </span>
            <input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-32 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[0.95rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
            />
          </label>
          <button
            type="button"
            onClick={generate}
            className="rounded-md border border-[#47c9d9]/45 bg-[#06181c]/82 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/70 hover:bg-[#0a2228]"
          >
            {language === "vi" ? "Sinh lại" : "Regenerate"}
          </button>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Kết quả" : "Output"}>
        <div className="max-h-72 overflow-auto rounded-md border border-[#12323a] bg-[#040a0c] p-2 font-mono text-[0.78rem] text-[#dff3f6]">
          {items.map((it, idx) => <div key={`${it}-${idx}`} className="py-0.5">{it}</div>)}
        </div>
        <div className="mt-2"><CopyButton value={items.join("\n")} /></div>
      </Panel>
    </div>
  );
}

function PasswordTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [length, setLength] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [exclude, setExclude] = useState("");
  const [out, setOut] = useState("");

  const generate = () => {
    let pool = "";
    if (upper) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lower) pool += "abcdefghijklmnopqrstuvwxyz";
    if (digits) pool += "0123456789";
    if (symbols) pool += "!@#$%^&*()-_=+[]{}/<>?.,;:";
    for (const ch of exclude) pool = pool.split(ch).join("");
    if (!pool) { setOut(""); return; }
    const buf = new Uint32Array(length);
    crypto.getRandomValues(buf);
    let res = "";
    for (let i = 0; i < length; i += 1) res += pool[buf[i] % pool.length];
    setOut(res);
  };

  useEffect(() => { generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [length, upper, lower, digits, symbols, exclude]);

  const strength = useMemo(() => {
    if (!out) return { label: "—", tone: "text-[#5e574e]" };
    const variety = (upper ? 26 : 0) + (lower ? 26 : 0) + (digits ? 10 : 0) + (symbols ? 25 : 0) - exclude.length;
    const bits = Math.log2(Math.max(1, variety)) * length;
    if (bits < 50) return { label: language === "vi" ? "Yếu" : "Weak", tone: "text-[#ffb4ad]" };
    if (bits < 80) return { label: language === "vi" ? "Khá" : "Fair", tone: "text-[#f0c86d]" };
    if (bits < 120) return { label: language === "vi" ? "Mạnh" : "Strong", tone: "text-[#7dd391]" };
    return { label: language === "vi" ? "Rất mạnh" : "Excellent", tone: "text-[#a8e8f0]" };
  }, [out, length, upper, lower, digits, symbols, exclude, language]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Cấu hình" : "Settings"}>
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#79ddeb]">
              {language === "vi" ? "Độ dài" : "Length"}: {length}
            </span>
            <input type="range" min={6} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="accent-[#47c9d9]" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: upper, set: setUpper, vi: "Hoa A-Z", en: "Upper A-Z" },
              { v: lower, set: setLower, vi: "Thường a-z", en: "Lower a-z" },
              { v: digits, set: setDigits, vi: "Số 0-9", en: "Digits 0-9" },
              { v: symbols, set: setSymbols, vi: "Ký tự đặc biệt", en: "Symbols" },
            ].map((opt) => (
              <label key={opt.en} className="flex items-center gap-2 rounded-md border border-[#12323a] bg-[#040a0c] px-2.5 py-1.5 text-[0.78rem] text-[#dff3f6]">
                <input type="checkbox" checked={opt.v} onChange={(e) => opt.set(e.target.checked)} className="accent-[#47c9d9]" />
                {language === "vi" ? opt.vi : opt.en}
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#79ddeb]">
              {language === "vi" ? "Loại ký tự" : "Exclude chars"}
            </span>
            <input
              value={exclude}
              onChange={(e) => setExclude(e.target.value)}
              placeholder="0Oo1lI"
              className="rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[0.85rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
            />
          </label>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Mật khẩu" : "Password"}>
        <pre className="break-all rounded-md border border-[#12323a] bg-[#040a0c] p-3 font-mono text-[0.95rem] text-[#dff3f6]">{out || "—"}</pre>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={cn("font-mono text-[0.62rem] uppercase tracking-[0.18em]", strength.tone)}>{strength.label}</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={generate} className="rounded-md border border-[#47c9d9]/45 bg-[#06181c]/82 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#a8e8f0]">
              {language === "vi" ? "Sinh lại" : "Regenerate"}
            </button>
            {out ? <CopyButton value={out} /> : null}
          </div>
        </div>
      </Panel>
    </div>
  );
}

const LOREM_VI = "Hôm nay trời mưa to ở Sài Gòn nên cả văn phòng quyết định ở lại làm tới khuya và gọi vài hộp cơm tấm sườn nướng cho đỡ mệt".split(" ");
const LOREM_EN = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");

function buildLorem(count: number, mode: "word" | "sentence" | "paragraph", lang: "vi" | "en"): string {
  const pool = lang === "vi" ? LOREM_VI : LOREM_EN;
  const word = () => pool[Math.floor(Math.random() * pool.length)];
  const sentence = () => {
    const len = 8 + Math.floor(Math.random() * 10);
    const words = Array.from({ length: len }, word);
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    return words.join(" ") + ".";
  };
  const paragraph = () => Array.from({ length: 4 + Math.floor(Math.random() * 4) }, sentence).join(" ");
  if (mode === "word") return Array.from({ length: count }, word).join(" ");
  if (mode === "sentence") return Array.from({ length: count }, sentence).join(" ");
  return Array.from({ length: count }, paragraph).join("\n\n");
}

function LoremTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [count, setCount] = useState(3);
  const [mode, setMode] = useState<"word" | "sentence" | "paragraph">("paragraph");
  const [out, setOut] = useState("");

  useEffect(() => { setOut(buildLorem(count, mode, language)); }, [count, mode, language]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Cấu hình" : "Settings"}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(["word", "sentence", "paragraph"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  mode === m ? "border-[#47c9d9]/65 bg-[#47c9d9]/14 text-[#a8e8f0]" : "border-white/10 text-[#79ddeb] hover:border-[#47c9d9]/40",
                )}
              >
                {m === "word" ? (language === "vi" ? "Từ" : "Words") : m === "sentence" ? (language === "vi" ? "Câu" : "Sentences") : (language === "vi" ? "Đoạn" : "Paragraphs")}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#79ddeb]">
              {language === "vi" ? "Số lượng" : "Count"}: {count}
            </span>
            <input type="range" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="accent-[#47c9d9]" />
          </label>
          <button type="button" onClick={() => setOut(buildLorem(count, mode, language))} className="rounded-md border border-[#47c9d9]/45 bg-[#06181c]/82 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#a8e8f0]">
            {language === "vi" ? "Sinh lại" : "Regenerate"}
          </button>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Kết quả" : "Output"}>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[#12323a] bg-[#040a0c] p-3 text-[0.82rem] text-[#dff3f6]">{out}</pre>
        <div className="mt-2"><CopyButton value={out} /></div>
      </Panel>
    </div>
  );
}

const VI_DIACRITICS: Record<string, string> = {
  à:"a",á:"a",ả:"a",ã:"a",ạ:"a",ă:"a",ằ:"a",ắ:"a",ẳ:"a",ẵ:"a",ặ:"a",â:"a",ầ:"a",ấ:"a",ẩ:"a",ẫ:"a",ậ:"a",
  è:"e",é:"e",ẻ:"e",ẽ:"e",ẹ:"e",ê:"e",ề:"e",ế:"e",ể:"e",ễ:"e",ệ:"e",
  ì:"i",í:"i",ỉ:"i",ĩ:"i",ị:"i",
  ò:"o",ó:"o",ỏ:"o",õ:"o",ọ:"o",ô:"o",ồ:"o",ố:"o",ổ:"o",ỗ:"o",ộ:"o",ơ:"o",ờ:"o",ớ:"o",ở:"o",ỡ:"o",ợ:"o",
  ù:"u",ú:"u",ủ:"u",ũ:"u",ụ:"u",ư:"u",ừ:"u",ứ:"u",ử:"u",ữ:"u",ự:"u",
  ỳ:"y",ý:"y",ỷ:"y",ỹ:"y",ỵ:"y",
  đ:"d",
};

function slugify(input: string): string {
  const lower = input.toLowerCase();
  let out = "";
  for (const ch of lower) out += VI_DIACRITICS[ch] ?? ch;
  return out
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SlugTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [input, setInput] = useState(language === "vi" ? "Hướng dẫn dùng MrNine cho người mới" : "MrNine quickstart for newcomers");
  const slug = slugify(input);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Tiêu đề" : "Title"}>
        <TextArea value={input} onChange={setInput} mono={false} />
      </Panel>
      <Panel title="Slug">
        <pre className="rounded-md border border-[#12323a] bg-[#040a0c] p-3 font-mono text-[0.95rem] text-[#dff3f6]">{slug || "—"}</pre>
        <div className="mt-2"><CopyButton value={slug} /></div>
      </Panel>
    </div>
  );
}

// =====================================================================
// Text utilities
// =====================================================================

function lcsDiff(a: string[], b: string[]): Array<{ type: "same" | "add" | "del"; value: string }> {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: Array<{ type: "same" | "add" | "del"; value: string }> = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push({ type: "same", value: a[i] }); i += 1; j += 1; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "del", value: a[i] }); i += 1; }
    else { out.push({ type: "add", value: b[j] }); j += 1; }
  }
  while (i < m) { out.push({ type: "del", value: a[i] }); i += 1; }
  while (j < n) { out.push({ type: "add", value: b[j] }); j += 1; }
  return out;
}

function DiffTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [a, setA] = useState("MrNine ships AI Playground and Photo Fix.");
  const [b, setB] = useState("MrNine ships AI Playground, Photo Fix and Markets.");
  const lines = useMemo(() => lcsDiff(a.split("\n"), b.split("\n")), [a, b]);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Văn bản A" : "Text A"}>
        <TextArea value={a} onChange={setA} />
      </Panel>
      <Panel title={language === "vi" ? "Văn bản B" : "Text B"}>
        <TextArea value={b} onChange={setB} />
      </Panel>
      <div className="lg:col-span-2">
        <Panel title="Diff">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[#12323a] bg-[#040a0c] p-3 font-mono text-[0.82rem] leading-6">
            {lines.map((l, idx) => (
              <div
                key={idx}
                className={cn(
                  "px-2",
                  l.type === "add" && "bg-[#45a85d]/14 text-[#7dd391]",
                  l.type === "del" && "bg-[#ef4444]/14 text-[#ffb4ad] line-through",
                  l.type === "same" && "text-[#79ddeb]",
                )}
              >
                {l.type === "add" ? "+ " : l.type === "del" ? "− " : "  "}{l.value || " "}
              </div>
            ))}
          </pre>
        </Panel>
      </div>
    </div>
  );
}

function CountTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [text, setText] = useState(language === "vi"
    ? "MrNine giúp bạn tạo nội dung AI nhanh hơn — viết, vẽ, dựng video, xử lý tài liệu, code và đọc tài chính trong cùng một trang."
    : "MrNine helps you ship AI content faster — write, draw, render videos, parse documents, code and read finance in one page.");

  const stats = useMemo(() => {
    const chars = Array.from(text).length;
    const charsNoSpace = Array.from(text.replace(/\s/g, "")).length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const sentences = text.split(/[.!?。！？]+/).filter((s) => s.trim()).length;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const bytes = new TextEncoder().encode(text).length;
    const readMin = Math.max(1, Math.round(words / 220));
    return { chars, charsNoSpace, words, sentences, paragraphs, bytes, readMin };
  }, [text]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Văn bản" : "Text"}>
        <TextArea value={text} onChange={setText} mono={false} />
      </Panel>
      <Panel title={language === "vi" ? "Thống kê" : "Stats"}>
        <div className="space-y-2">
          <Row label={language === "vi" ? "Ký tự" : "Characters"} value={stats.chars.toString()} />
          <Row label={language === "vi" ? "Ký tự (không khoảng trắng)" : "Characters (no spaces)"} value={stats.charsNoSpace.toString()} />
          <Row label={language === "vi" ? "Từ" : "Words"} value={stats.words.toString()} />
          <Row label={language === "vi" ? "Câu" : "Sentences"} value={stats.sentences.toString()} />
          <Row label={language === "vi" ? "Đoạn" : "Paragraphs"} value={stats.paragraphs.toString()} />
          <Row label="Bytes (UTF-8)" value={stats.bytes.toString()} />
          <Row label={language === "vi" ? "Thời gian đọc" : "Reading time"} value={`~ ${stats.readMin} ${language === "vi" ? "phút" : "min"}`} />
        </div>
      </Panel>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdown(md: string): string {
  let html = escapeHtml(md);
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  html = html.replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  html = html.split(/\n{2,}/).map((b) => /^<(h\d|ul|pre)/.test(b) ? b : `<p>${b.replace(/\n/g, "<br/>")}</p>`).join("\n");
  return html;
}

function MarkdownTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [md, setMd] = useState(`# Hello MrNine\n\nỞ đây có **bold**, *italic* và \`inline code\`.\n\n- mục 1\n- mục 2\n\n[mrnine.net](https://mrnine.net)`);
  const html = useMemo(() => renderMarkdown(md), [md]);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Markdown">
        <TextArea value={md} onChange={setMd} />
      </Panel>
      <Panel title={language === "vi" ? "Xem trước" : "Preview"}>
        <div
          className="markdown-preview max-h-96 overflow-auto rounded-md border border-[#12323a] bg-[#040a0c] p-4 text-[0.88rem] leading-7 text-[#dff3f6]"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Panel>
    </div>
  );
}

function caseConvert(input: string, mode: string): string {
  const words = input.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().split(/\s+/);
  switch (mode) {
    case "camel": return words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
    case "pascal": return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
    case "snake": return words.map((w) => w.toLowerCase()).join("_");
    case "kebab": return words.map((w) => w.toLowerCase()).join("-");
    case "constant": return words.map((w) => w.toUpperCase()).join("_");
    case "upper": return input.toUpperCase();
    case "lower": return input.toLowerCase();
    case "title": return input.replace(/\b\w/g, (m) => m.toUpperCase());
    default: return input;
  }
}

function CaseTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [input, setInput] = useState("MrNine command surface");
  const modes: ReadonlyArray<{ id: string; vi: string; en: string }> = [
    { id: "camel", vi: "camelCase", en: "camelCase" },
    { id: "pascal", vi: "PascalCase", en: "PascalCase" },
    { id: "snake", vi: "snake_case", en: "snake_case" },
    { id: "kebab", vi: "kebab-case", en: "kebab-case" },
    { id: "constant", vi: "CONSTANT", en: "CONSTANT" },
    { id: "upper", vi: "UPPER", en: "UPPER" },
    { id: "lower", vi: "lower", en: "lower" },
    { id: "title", vi: "Title Case", en: "Title Case" },
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đầu vào" : "Input"}>
        <TextArea value={input} onChange={setInput} mono={false} />
      </Panel>
      <Panel title={language === "vi" ? "Quy đổi" : "Conversions"}>
        <div className="space-y-2">
          {modes.map((m) => <Row key={m.id} label={language === "vi" ? m.vi : m.en} value={caseConvert(input, m.id)} />)}
        </div>
      </Panel>
    </div>
  );
}

// =====================================================================
// Code & Design
// =====================================================================

function explainCron(expr: string, lang: "vi" | "en"): { ok: boolean; text: string; nextRuns?: string[] } {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { ok: false, text: lang === "vi" ? "Cron cần đúng 5 trường: phút giờ ngày tháng thứ" : "Cron needs 5 fields: minute hour day month dow" };
  }
  const [m, h, dom, mon, dow] = parts;
  const hum = (v: string, name: { vi: string; en: string }) => {
    if (v === "*") return lang === "vi" ? `mọi ${name.vi}` : `every ${name.en}`;
    if (v.startsWith("*/")) return lang === "vi" ? `mỗi ${v.slice(2)} ${name.vi}` : `every ${v.slice(2)} ${name.en}`;
    return `${name.vi === "phút" ? "phút" : name.en} ${v}`;
  };
  const text = lang === "vi"
    ? `Chạy ${hum(m, { vi: "phút", en: "minute" })}, ${hum(h, { vi: "giờ", en: "hour" })}, ${hum(dom, { vi: "ngày", en: "day" })} của ${hum(mon, { vi: "tháng", en: "month" })} (${hum(dow, { vi: "thứ", en: "weekday" })}).`
    : `Runs at ${hum(m, { vi: "phút", en: "minute" })}, ${hum(h, { vi: "giờ", en: "hour" })}, ${hum(dom, { vi: "ngày", en: "day" })} of ${hum(mon, { vi: "tháng", en: "month" })}, ${hum(dow, { vi: "thứ", en: "weekday" })}.`;
  const nextRuns = computeNextCron(parts as [string, string, string, string, string], 5);
  return { ok: true, text, nextRuns };
}

function matchField(v: string, value: number): boolean {
  if (v === "*") return true;
  if (v.startsWith("*/")) return value % Number(v.slice(2)) === 0;
  if (v.includes(",")) return v.split(",").some((p) => matchField(p, value));
  if (v.includes("-")) {
    const [a, b] = v.split("-").map(Number);
    return value >= a && value <= b;
  }
  return Number(v) === value;
}

function computeNextCron(parts: [string, string, string, string, string], count: number): string[] {
  const [m, h, dom, mon, dow] = parts;
  const out: string[] = [];
  const now = new Date();
  const candidate = new Date(now.getTime() + 60_000 - now.getSeconds() * 1000 - now.getMilliseconds());
  candidate.setSeconds(0, 0);
  let safety = 0;
  while (out.length < count && safety < 366 * 24 * 60) {
    if (
      matchField(m, candidate.getMinutes()) &&
      matchField(h, candidate.getHours()) &&
      matchField(dom, candidate.getDate()) &&
      matchField(mon, candidate.getMonth() + 1) &&
      matchField(dow, candidate.getDay())
    ) {
      out.push(candidate.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }));
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
    safety += 1;
  }
  return out;
}

function CronTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [expr, setExpr] = useState("0 9 * * 1-5");
  const result = useMemo(() => explainCron(expr, language), [expr, language]);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Cron">
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          className="w-full rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[1rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
          placeholder="*/5 * * * *"
        />
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {["* * * * *", "0 * * * *", "*/5 * * * *", "0 9 * * 1-5"].map((preset) => (
            <button key={preset} type="button" onClick={() => setExpr(preset)} className="rounded-md border border-[#12323a] bg-[#040a0c] px-2 py-1.5 font-mono text-[0.62rem] text-[#79ddeb] transition hover:border-[#47c9d9]/45">
              {preset}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[0.78rem] text-[#dff3f6]">{result.text}</p>
      </Panel>
      <Panel title={language === "vi" ? "Lần chạy kế tiếp (giờ VN)" : "Next runs (VN time)"}>
        {result.ok && result.nextRuns ? (
          <div className="space-y-1.5">
            {result.nextRuns.length === 0 ? (
              <p className="text-[0.78rem] text-[#79ddeb]">{language === "vi" ? "Không tìm được lần chạy trong 1 năm tới." : "No run found in next year."}</p>
            ) : (
              result.nextRuns.map((r) => <Row key={r} label="→" value={r} />)
            )}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", " ": "&nbsp;",
  "©": "&copy;", "®": "&reg;", "™": "&trade;", "€": "&euro;", "£": "&pound;", "¥": "&yen;",
};

function HtmlTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [plain, setPlain] = useState(`<h1>Xin chào "MrNine" © 2026</h1>`);
  const encoded = useMemo(() => plain.replace(/[&<>"' ©®™€£¥]/g, (ch) => HTML_ENTITIES[ch] ?? ch), [plain]);

  const decode = (value: string) => {
    const tmp = document.createElement("textarea");
    tmp.innerHTML = value;
    setPlain(tmp.value);
  };
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "HTML thô" : "Raw"}>
        <TextArea value={plain} onChange={setPlain} />
        <div className="mt-2"><CopyButton value={plain} /></div>
      </Panel>
      <Panel title="Encoded">
        <TextArea value={encoded} onChange={(v) => { decode(v); }} />
        <div className="mt-2"><CopyButton value={encoded} /></div>
      </Panel>
    </div>
  );
}

function NumBaseTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [value, setValue] = useState("255");
  const [base, setBase] = useState(10);

  const num = useMemo(() => {
    if (!value.trim()) return null;
    try {
      const cleaned = value.replace(/^0[xb]/i, "").replace(/[\s,]/g, "");
      const n = parseInt(cleaned, base);
      if (Number.isNaN(n)) return null;
      return n;
    } catch {
      return null;
    }
  }, [value, base]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đầu vào" : "Input"}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[1rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
          placeholder="255 / 0xff / 0b11111111"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[2, 8, 10, 16].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBase(b)}
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                base === b ? "border-[#47c9d9]/65 bg-[#47c9d9]/14 text-[#a8e8f0]" : "border-white/10 text-[#79ddeb] hover:border-[#47c9d9]/40",
              )}
            >
              {language === "vi" ? `Cơ số ${b}` : `Base ${b}`}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Quy đổi" : "Conversions"}>
        {num !== null ? (
          <div className="space-y-2">
            <Row label="Binary" value={num.toString(2)} />
            <Row label="Octal" value={num.toString(8)} />
            <Row label="Decimal" value={num.toString(10)} />
            <Row label="Hex" value={num.toString(16).toUpperCase()} />
            <Row label="Hex (0x)" value={`0x${num.toString(16).toUpperCase()}`} />
          </div>
        ) : (
          <p className="text-[0.78rem] text-[#ffb4ad]">{language === "vi" ? "Số không hợp lệ với cơ số này." : "Invalid number for the given base."}</p>
        )}
      </Panel>
    </div>
  );
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

function ContrastTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [fg, setFg] = useState("#dff3f6");
  const [bg, setBg] = useState("#060b0d");
  const fgRgb = parseHex(fg);
  const bgRgb = parseHex(bg);
  const ratio = useMemo(() => {
    if (!fgRgb || !bgRgb) return 0;
    const l1 = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
    const l2 = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }, [fgRgb, bgRgb]);

  const grade = (min: number) => ratio >= min ? { vi: "Đạt", en: "Pass", tone: "text-[#7dd391]" } : { vi: "Trượt", en: "Fail", tone: "text-[#ffb4ad]" };
  const aaNormal = grade(4.5);
  const aaLarge = grade(3);
  const aaaNormal = grade(7);
  const aaaLarge = grade(4.5);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Màu" : "Colors"}>
        <div className="space-y-3">
          {[
            { label: language === "vi" ? "Chữ" : "Foreground", value: fg, set: setFg },
            { label: language === "vi" ? "Nền" : "Background", value: bg, set: setBg },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <input type="color" value={parseHex(row.value) ? row.value : "#000000"} onChange={(e) => row.set(e.target.value)} className="size-12 cursor-pointer rounded-md border border-[#12323a] bg-transparent" />
              <input value={row.value} onChange={(e) => row.set(e.target.value)} className="flex-1 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[0.95rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55" />
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#5e574e]">{row.label}</span>
            </div>
          ))}
          <div className="rounded-md border border-[#12323a] p-4" style={{ background: bg, color: fg }}>
            <p className="text-[1.05rem] font-bold">MrNine</p>
            <p className="text-[0.85rem]">{language === "vi" ? "Mẫu chữ với cặp màu này" : "Sample text in this combo"}</p>
          </div>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Tỉ lệ tương phản WCAG" : "WCAG contrast ratio"}>
        <div className="space-y-2">
          <Row label="Ratio" value={ratio.toFixed(2)} />
          <Row label="AA · normal (4.5)" value={language === "vi" ? aaNormal.vi : aaNormal.en} />
          <Row label="AA · large (3.0)" value={language === "vi" ? aaLarge.vi : aaLarge.en} />
          <Row label="AAA · normal (7.0)" value={language === "vi" ? aaaNormal.vi : aaaNormal.en} />
          <Row label="AAA · large (4.5)" value={language === "vi" ? aaaLarge.vi : aaaLarge.en} />
        </div>
        <p className="mt-3 text-[0.7rem] text-[#79ddeb]">
          {language === "vi"
            ? "Large = ≥18.66px bold hoặc ≥24px regular."
            : "Large = ≥18.66px bold or ≥24px regular."}
        </p>
      </Panel>
    </div>
  );
}
