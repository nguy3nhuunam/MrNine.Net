import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YUNWU_BASE_URL = "https://yunwu.ai/v1";
const YUNWU_MODEL = "gpt-5.5";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function loadYunwuApiKey() {
  if (process.env.YUNWU_API_KEY) {
    return process.env.YUNWU_API_KEY;
  }

  const secretsPath = join(process.cwd(), ".webai-inkos", ".inkos", "secrets.json");
  const raw = await readFile(secretsPath, "utf8");
  const secrets = JSON.parse(raw) as {
    services?: Record<string, { apiKey?: string }>;
  };

  return secrets.services?.["custom:Yunwu ChatGPT"]?.apiKey;
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((message) => {
      if (!message || typeof message !== "object") {
        return null;
      }

      const candidate = message as { role?: unknown; content?: unknown };
      const role = candidate.role;
      const content = typeof candidate.content === "string" ? candidate.content.trim() : "";

      if ((role === "user" || role === "assistant") && content) {
        return { role, content };
      }

      return null;
    })
    .filter((message): message is ChatMessage => Boolean(message))
    .slice(-12);
}

function extractAssistantText(json: unknown) {
  const response = json as {
    choices?: Array<{
      message?: { content?: string | Array<{ text?: string; content?: string }> };
    }>;
  };
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text || part.content || "")
      .join("")
      .trim();
  }

  return "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const messages = normalizeMessages((body as { messages?: unknown } | null)?.messages);

  if (messages.length === 0) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = await loadYunwuApiKey().catch(() => undefined);

  if (!apiKey) {
    return NextResponse.json({ error: "Yunwu API key is not configured." }, { status: 500 });
  }

  const response = await fetch(`${YUNWU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: YUNWU_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are MrNine, a concise AI assistant inside mrnine.net. Help with writing, images, video, voice, documents, coding, planning, and web workflows. Match the user's language.",
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1200,
      stream: false,
    }),
  });

  const json = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));

  if (!response.ok) {
    return NextResponse.json(
      { error: "Yunwu API request failed.", detail: json },
      { status: response.status },
    );
  }

  const text = extractAssistantText(json);

  if (!text) {
    return NextResponse.json({ error: "Model returned an empty response." }, { status: 502 });
  }

  return NextResponse.json({ message: text, model: YUNWU_MODEL });
}
