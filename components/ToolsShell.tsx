"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CaseSensitive,
  Clock,
  Contrast,
  Copy,
  FileText,
  GitCompare,
  Hash,
  Lock,
  Palette,
  Sigma,
  TextCursorInput,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type ToolId =
  | "count"
  | "slug"
  | "case"
  | "markdown"
  | "diff"
  | "numwords"
  | "password"
  | "color"
  | "contrast"
  | "timestamp";

type ToolGroup = "text" | "number" | "security" | "design" | "time";

const tools: ReadonlyArray<{
  id: ToolId;
  group: ToolGroup;
  icon: typeof Wrench;
  titleVi: string;
  titleEn: string;
  hintVi: string;
  hintEn: string;
}> = [
  { id: "count", group: "text", icon: Sigma, titleVi: "Đếm chữ", titleEn: "Word count", hintVi: "Ký tự · từ · câu · đoạn", hintEn: "Char · word · sentence · paragraph" },
  { id: "slug", group: "text", icon: TextCursorInput, titleVi: "Slug VN", titleEn: "VN slug", hintVi: "Bỏ dấu · kebab-case", hintEn: "Strip diacritics · kebab" },
  { id: "case", group: "text", icon: CaseSensitive, titleVi: "Đổi case", titleEn: "Case convert", hintVi: "Hoa · thường · Title · camel", hintEn: "UPPER · lower · Title · camel" },
  { id: "markdown", group: "text", icon: FileText, titleVi: "Markdown", titleEn: "Markdown", hintVi: "Xem trước realtime", hintEn: "Live preview" },
  { id: "diff", group: "text", icon: GitCompare, titleVi: "So sánh", titleEn: "Diff", hintVi: "Diff hai đoạn văn bản", hintEn: "Compare two strings" },
  { id: "numwords", group: "number", icon: Hash, titleVi: "Số → chữ", titleEn: "Number to words", hintVi: "VND · hợp đồng · hoá đơn", hintEn: "VND · contracts · invoices" },
  { id: "password", group: "security", icon: Lock, titleVi: "Mật khẩu", titleEn: "Password", hintVi: "Sinh mật khẩu mạnh", hintEn: "Strong password gen" },
  { id: "color", group: "design", icon: Palette, titleVi: "Màu", titleEn: "Color", hintVi: "HEX ↔ RGB ↔ HSL", hintEn: "HEX ↔ RGB ↔ HSL" },
  { id: "contrast", group: "design", icon: Contrast, titleVi: "Contrast WCAG", titleEn: "Contrast WCAG", hintVi: "Kiểm tra AA / AAA", hintEn: "Check AA / AAA" },
  { id: "timestamp", group: "time", icon: Clock, titleVi: "Timestamp", titleEn: "Timestamp", hintVi: "Unix ↔ ISO ↔ Việt Nam", hintEn: "Unix ↔ ISO ↔ Vietnam" },
];

const groupLabels: Record<ToolGroup, { vi: string; en: string }> = {
  text: { vi: "Văn bản", en: "Text" },
  number: { vi: "Số", en: "Number" },
  security: { vi: "An toàn", en: "Security" },
  design: { vi: "Thiết kế", en: "Design" },
  time: { vi: "Thời gian", en: "Time" },
};

export function ToolsShell() {
  const { language } = useLanguage();
  const [active, setActive] = useState<ToolId>("count");

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
            {language === "vi" ? "Hộp công cụ thực dụng" : "Practical toolkit"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "đếm · slug · số → chữ · mật khẩu" : "count · slug · num→words · password"}
          </h2>
          <p className="mt-3 max-w-3xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "10 công cụ thực dụng cho người Việt: đếm chữ, slug bỏ dấu, đổi case, markdown, so sánh, đọc số tiền, sinh mật khẩu, kiểm tra màu, timestamp. Chạy hoàn toàn trên trình duyệt — dữ liệu của bạn không gửi lên server."
              : "10 practical utilities, fully client-side. Word count, VN slug, case convert, markdown, diff, number-to-words VND, password generator, color picker, WCAG contrast, timestamp."}
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
          {active === "count" ? <CountTool language={language} /> : null}
          {active === "slug" ? <SlugTool language={language} /> : null}
          {active === "case" ? <CaseTool language={language} /> : null}
          {active === "markdown" ? <MarkdownTool language={language} /> : null}
          {active === "diff" ? <DiffTool language={language} /> : null}
          {active === "numwords" ? <NumWordsTool language={language} /> : null}
          {active === "password" ? <PasswordTool language={language} /> : null}
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

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">{label}</span>
      <code className="flex-1 truncate text-right font-mono text-[0.78rem] text-[#dff3f6]">{value}</code>
      <CopyButton value={value} />
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
    const lines = text === "" ? 0 : text.split(/\n/).length;
    const bytes = new TextEncoder().encode(text).length;
    const readMin = words === 0 ? 0 : Math.max(1, Math.round(words / 220));
    return { chars, charsNoSpace, words, sentences, paragraphs, lines, bytes, readMin };
  }, [text]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Văn bản" : "Text"}>
        <TextArea value={text} onChange={setText} mono={false} placeholder={language === "vi" ? "Dán văn bản..." : "Paste text..."} />
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => setText("")}
            className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb] transition hover:border-white/30"
          >
            {language === "vi" ? "Xoá" : "Clear"}
          </button>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Thống kê" : "Stats"}>
        <div className="space-y-2">
          <Row label={language === "vi" ? "Ký tự" : "Characters"} value={stats.chars.toString()} />
          <Row label={language === "vi" ? "Ký tự (không khoảng trắng)" : "Characters (no spaces)"} value={stats.charsNoSpace.toString()} />
          <Row label={language === "vi" ? "Từ" : "Words"} value={stats.words.toString()} />
          <Row label={language === "vi" ? "Câu" : "Sentences"} value={stats.sentences.toString()} />
          <Row label={language === "vi" ? "Đoạn" : "Paragraphs"} value={stats.paragraphs.toString()} />
          <Row label={language === "vi" ? "Dòng" : "Lines"} value={stats.lines.toString()} />
          <Row label="Bytes (UTF-8)" value={stats.bytes.toString()} />
          <Row label={language === "vi" ? "Thời gian đọc" : "Reading time"} value={`~ ${stats.readMin} ${language === "vi" ? "phút" : "min"}`} />
        </div>
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
  const [input, setInput] = useState(language === "vi" ? "Hướng dẫn dùng MrNine cho người mới bắt đầu" : "MrNine quickstart guide for newcomers");
  const slug = slugify(input);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Tiêu đề" : "Title"}>
        <TextArea value={input} onChange={setInput} mono={false} placeholder={language === "vi" ? "Nhập tiêu đề có dấu" : "Enter a title"} />
      </Panel>
      <Panel title="Slug">
        <pre className="rounded-md border border-[#12323a] bg-[#040a0c] p-3 font-mono text-[0.95rem] text-[#dff3f6]">{slug || "—"}</pre>
        <div className="mt-2"><CopyButton value={slug} /></div>
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
    { id: "upper", vi: "VIẾT HOA", en: "UPPER" },
    { id: "lower", vi: "viết thường", en: "lower" },
    { id: "title", vi: "Viết Hoa Mỗi Từ", en: "Title Case" },
    { id: "camel", vi: "camelCase", en: "camelCase" },
    { id: "pascal", vi: "PascalCase", en: "PascalCase" },
    { id: "snake", vi: "snake_case", en: "snake_case" },
    { id: "kebab", vi: "kebab-case", en: "kebab-case" },
    { id: "constant", vi: "CONSTANT", en: "CONSTANT" },
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
  const [md, setMd] = useState(`# Hello MrNine\n\nỞ đây có **đậm**, *nghiêng* và \`inline code\`.\n\n- mục 1\n- mục 2\n\n[mrnine.net](https://mrnine.net)`);
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
  const [a, setA] = useState(language === "vi" ? "MrNine có AI Playground và Photo Fix.\nNgoài ra có Story Writer." : "MrNine ships AI Playground and Photo Fix.\nAlso has Story Writer.");
  const [b, setB] = useState(language === "vi" ? "MrNine có AI Playground, Photo Fix và Markets.\nNgoài ra có Story Writer.\nTools mới." : "MrNine ships AI Playground, Photo Fix and Markets.\nAlso has Story Writer.\nNew Tools.");
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
                {l.type === "add" ? "+ " : l.type === "del" ? "− " : "  "}{l.value || " "}
              </div>
            ))}
          </pre>
        </Panel>
      </div>
    </div>
  );
}

const VN_DIGIT = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readTriple(n: number, full: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donVi = n % 10;
  const parts: string[] = [];
  if (tram > 0 || full) parts.push(`${VN_DIGIT[tram]} trăm`);
  if (chuc > 1) {
    parts.push(`${VN_DIGIT[chuc]} mươi`);
    if (donVi === 1) parts.push("mốt");
    else if (donVi === 5) parts.push("lăm");
    else if (donVi > 0) parts.push(VN_DIGIT[donVi]);
  } else if (chuc === 1) {
    parts.push("mười");
    if (donVi === 5) parts.push("lăm");
    else if (donVi > 0) parts.push(VN_DIGIT[donVi]);
  } else if (chuc === 0) {
    if (donVi > 0) {
      if (full) parts.push("lẻ");
      parts.push(VN_DIGIT[donVi]);
    }
  }
  return parts.join(" ").trim();
}

function numberToVietnameseWords(num: number): string {
  if (!Number.isFinite(num)) return "";
  if (num === 0) return "không";
  const negative = num < 0;
  let n = Math.floor(Math.abs(num));
  if (n === 0) return "không";

  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const scale = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const g = groups[i];
    if (g === 0) continue;
    const isLeading = i === groups.length - 1;
    const piece = readTriple(g, !isLeading);
    parts.push(`${piece}${scale[i] ? " " + scale[i] : ""}`);
  }
  let result = parts.join(" ").replace(/\s+/g, " ").trim();
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return negative ? `Âm ${result.toLowerCase()}` : result;
}

function NumWordsTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [input, setInput] = useState("1500000");
  const numeric = useMemo(() => {
    const cleaned = input.replace(/[\s.,_]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }, [input]);
  const valid = Number.isFinite(numeric);
  const words = valid ? numberToVietnameseWords(numeric) : "";
  const dong = valid ? `${words} đồng` : "";
  const dongChan = valid ? `${words} đồng chẵn` : "";
  const usd = valid ? `${words} đô la Mỹ` : "";

  const presets = [1000, 50000, 1500000, 250000000, 12500000000];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Số tiền" : "Number"}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1500000"
          inputMode="numeric"
          className="w-full rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[1.2rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
        />
        {valid ? (
          <p className="mt-2 font-mono text-[0.78rem] text-[#a8e8f0]">
            {numeric.toLocaleString("vi-VN")} {language === "vi" ? "đồng" : "VND"}
          </p>
        ) : (
          <p className="mt-2 font-mono text-[0.78rem] text-[#ffb4ad]">
            {language === "vi" ? "Số không hợp lệ" : "Invalid number"}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setInput(p.toString())}
              className="rounded-md border border-[#12323a] bg-[#040a0c] px-2 py-1 font-mono text-[0.6rem] text-[#79ddeb] transition hover:border-[#47c9d9]/45"
            >
              {p.toLocaleString("vi-VN")}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[0.7rem] leading-5 text-[#5e7a82]">
          {language === "vi"
            ? "Hỗ trợ tới hàng triệu tỷ. Dùng cho hợp đồng, hoá đơn, séc — chạy offline."
            : "Up to quadrillions. For contracts, invoices, cheques. Runs offline."}
        </p>
      </Panel>
      <Panel title={language === "vi" ? "Đọc thành chữ" : "In words"}>
        {valid ? (
          <div className="space-y-2">
            <Row label={language === "vi" ? "Bằng chữ" : "Words"} value={words} />
            <Row label={language === "vi" ? "Hợp đồng (đồng)" : "Contract (VND)"} value={dong} />
            <Row label={language === "vi" ? "Hoá đơn (đồng chẵn)" : "Invoice (VND flat)"} value={dongChan} />
            <Row label="USD" value={usd} />
          </div>
        ) : null}
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
              { v: upper, set: setUpper, vi: "Chữ hoa A-Z", en: "Upper A-Z" },
              { v: lower, set: setLower, vi: "Chữ thường a-z", en: "Lower a-z" },
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
              {language === "vi" ? "Loại trừ ký tự" : "Exclude chars"}
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

  const grade = (min: number) => ratio >= min ? { vi: "Đạt", en: "Pass" } : { vi: "Trượt", en: "Fail" };
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
            ? "Large = ≥18.66px in đậm hoặc ≥24px thường."
            : "Large = ≥18.66px bold or ≥24px regular."}
        </p>
      </Panel>
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
            <Row label={language === "vi" ? "Tương đối" : "Relative"} value={getRelative(date.getTime(), now, language)} />
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
