import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = process.cwd();
const INKOS_PROJECT_DIR = join(PROJECT_ROOT, ".webai-inkos");
const INKOS_CLI = join(PROJECT_ROOT, "node_modules", "@actalk", "inkos", "dist", "index.js");
const COMMAND_TIMEOUT_MS = 45_000;
const MAX_MESSAGE_LENGTH = 4_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StoryForgeResponse = {
  ok: boolean;
  message: string;
  raw?: unknown;
  setupRequired?: boolean;
};

async function loadProjectEnv() {
  try {
    const content = await readFile(join(INKOS_PROJECT_DIR, ".env"), "utf8");
    const entries: Record<string, string> = {};

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const separator = line.indexOf("=");

      if (separator <= 0) {
        continue;
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      entries[key] = value;
    }

    return entries;
  } catch {
    return {};
  }
}

async function runInkos(args: string[]) {
  const projectEnv = await loadProjectEnv();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
  };
  const cliArgs = [...args];

  if (projectEnv.INKOS_LLM_API_KEY) {
    env.WEBAI_INKOS_API_KEY = projectEnv.INKOS_LLM_API_KEY;
    cliArgs.unshift("--api-key-env", "WEBAI_INKOS_API_KEY");
  }

  if (projectEnv.INKOS_LLM_STREAM === "false") {
    cliArgs.unshift("--no-stream");
  } else if (projectEnv.INKOS_LLM_STREAM === "true") {
    cliArgs.unshift("--stream");
  }

  if (projectEnv.INKOS_LLM_API_FORMAT) {
    cliArgs.unshift("--api-format", projectEnv.INKOS_LLM_API_FORMAT);
  }

  if (projectEnv.INKOS_LLM_MODEL) {
    cliArgs.unshift("--model", projectEnv.INKOS_LLM_MODEL);
  }

  if (projectEnv.INKOS_LLM_BASE_URL) {
    cliArgs.unshift("--base-url", projectEnv.INKOS_LLM_BASE_URL);
  }

  if (projectEnv.INKOS_LLM_SERVICE) {
    cliArgs.unshift("--service", projectEnv.INKOS_LLM_SERVICE);
  }

  if (!env.INKOS_LLM_SERVICE && process.env.OPENAI_SERVICE) {
    env.INKOS_LLM_SERVICE = process.env.OPENAI_SERVICE;
  }

  if (!env.INKOS_LLM_BASE_URL && process.env.OPENAI_BASE_URL) {
    env.INKOS_LLM_BASE_URL = process.env.OPENAI_BASE_URL;
  }

  if (!env.INKOS_LLM_API_KEY && process.env.OPENAI_API_KEY) {
    env.INKOS_LLM_API_KEY = process.env.OPENAI_API_KEY;
  }

  if (!env.INKOS_LLM_MODEL && process.env.OPENAI_MODEL) {
    env.INKOS_LLM_MODEL = process.env.OPENAI_MODEL;
  }

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [INKOS_CLI, ...cliArgs], {
      cwd: INKOS_PROJECT_DIR,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(Object.assign(new Error("InkOS command timed out."), {
        code: "ETIMEDOUT",
        killed: true,
        signal: "SIGTERM",
        stdout,
        stderr,
      }));
    }, COMMAND_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(Object.assign(new Error(`InkOS exited with code ${code ?? "unknown"}.`), {
        code,
        signal,
        stdout,
        stderr,
      }));
    });
  });
}

async function ensureInkosProject() {
  await mkdir(INKOS_PROJECT_DIR, { recursive: true });

  if (!existsSync(join(INKOS_PROJECT_DIR, "inkos.json"))) {
    await runInkos(["init", "--lang", "en"]);
  }
}

function normalizeError(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { stdout?: unknown; stderr?: unknown; message?: unknown };
    return [candidate.stdout, candidate.stderr, candidate.message]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join("\n")
      .trim();
  }

  return String(error);
}

function isCommandTimeout(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { killed?: unknown; signal?: unknown; code?: unknown; message?: unknown };
  return candidate.killed === true || candidate.signal === "SIGTERM" || candidate.code === "ETIMEDOUT"
    || (typeof candidate.message === "string" && /timed out|timeout/i.test(candidate.message));
}

function extractAssistantMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const formattedDraft = formatCreationDraft(record);
  const keys = ["responseText", "assistantText", "result", "message", "content", "text"];

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      const text = value.trim();
      return formattedDraft && isGenericInkosStatus(text) ? formattedDraft : text;
    }
  }

  const assistant = record.assistant;
  if (assistant && typeof assistant === "object") {
    const assistantRecord = assistant as Record<string, unknown>;
    for (const key of keys) {
      const value = assistantRecord[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return fallback;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isGenericInkosStatus(text: string) {
  return text === "已生成建书参数，请确认或修改。" || text === "Book creation parameters generated. Please confirm or modify.";
}

function formatCreationDraft(payload: Record<string, unknown>) {
  const session = asRecord(payload.session);
  const draft = asRecord(session?.creationDraft);

  if (!draft) {
    return null;
  }

  const title = asText(draft.title);
  const genre = asText(draft.genre);
  const language = asText(draft.language);
  const blurb = asText(draft.blurb);
  const targetChapters = typeof draft.targetChapters === "number" ? draft.targetChapters : null;
  const chapterWordCount = typeof draft.chapterWordCount === "number" ? draft.chapterWordCount : null;

  if (!title && !blurb) {
    return null;
  }

  return [
    "InkOS đã dựng bản nháp Story Forge:",
    title ? `\nTiêu đề: ${title}` : null,
    genre ? `Thể loại: ${genre}` : null,
    language ? `Ngôn ngữ dự án: ${language}` : null,
    targetChapters ? `Số chương mục tiêu: ${targetChapters}` : null,
    chapterWordCount ? `Độ dài mỗi chương: ${chapterWordCount} từ` : null,
    blurb ? `\nTóm tắt:\n${blurb}` : null,
    "\nBạn có thể chỉnh request rồi chạy lại để phát triển outline, nhân vật hoặc chương mở đầu.",
  ].filter(Boolean).join("\n");
}

function createStoryForgeInstruction(message: string) {
  return [
    "MrNine Story Forge request.",
    "Respond in the same language as the user's request. If the user writes Vietnamese, answer in Vietnamese.",
    "Focus on practical fiction writing output: premise, logline, outline, character, chapter plan, or opening scene.",
    "",
    message,
  ].join("\n");
}

function parseInkosJson(stdout: string): StoryForgeResponse {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return {
      ok: true,
      message: "InkOS completed, but returned no visible message.",
    };
  }

  try {
    const payload = JSON.parse(trimmed) as unknown;
    return {
      ok: true,
      message: extractAssistantMessage(payload, trimmed),
      raw: payload,
    };
  } catch {
    return {
      ok: true,
      message: trimmed,
    };
  }
}

export async function POST(request: Request) {
  if (!existsSync(INKOS_CLI)) {
    return Response.json(
      {
        ok: false,
        setupRequired: true,
        message: "InkOS is not installed. Run npm install first.",
      } satisfies StoryForgeResponse,
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "Invalid JSON body." } satisfies StoryForgeResponse,
      { status: 400 },
    );
  }

  const message = typeof (body as { message?: unknown }).message === "string"
    ? (body as { message: string }).message.trim()
    : "";

  if (!message) {
    return Response.json(
      { ok: false, message: "Message is required." } satisfies StoryForgeResponse,
      { status: 400 },
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { ok: false, message: `Message is too long. Keep it under ${MAX_MESSAGE_LENGTH} characters.` } satisfies StoryForgeResponse,
      { status: 400 },
    );
  }

  try {
    await ensureInkosProject();
    const { stdout } = await runInkos(["agent", "--json", "--quiet", "--max-turns", "8", createStoryForgeInstruction(message)]);
    return Response.json(parseInkosJson(stdout));
  } catch (error) {
    const details = normalizeError(error);

    if (isCommandTimeout(error)) {
      return Response.json(
        {
          ok: false,
          message: [
            "InkOS mất quá lâu để phản hồi.",
            "Hãy thử request ngắn hơn, hoặc kiểm tra model/API key nếu server đang dùng model chậm.",
          ].join("\n\n"),
        } satisfies StoryForgeResponse,
        { status: 504 },
      );
    }

    const setupRequired = /api key|provider|model|config|INKOS_LLM|OPENAI_API_KEY|doctor/i.test(details);

    return Response.json(
      {
        ok: false,
        setupRequired,
        message: setupRequired
          ? [
              "InkOS is installed, but the writing model is not configured yet.",
              "Set your InkOS/OpenAI-compatible config in the server environment, then retry.",
              details,
            ].filter(Boolean).join("\n\n")
          : details || "InkOS failed to run.",
      } satisfies StoryForgeResponse,
      { status: setupRequired ? 409 : 500 },
    );
  }
}
