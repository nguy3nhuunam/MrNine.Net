import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const PROJECT_ROOT = process.cwd();
export const INKOS_PROJECT_DIR = join(PROJECT_ROOT, ".webai-inkos");
export const INKOS_CLI = join(PROJECT_ROOT, "node_modules", "@actalk", "inkos", "dist", "index.js");
const INKOS_STUDIO_ASSETS_DIR = join(
  PROJECT_ROOT,
  "node_modules",
  "@actalk",
  "inkos-studio",
  "dist",
  "assets",
);
const INKOS_CORE_AGENT_TOOLS = join(
  PROJECT_ROOT,
  "node_modules",
  "@actalk",
  "inkos-core",
  "dist",
  "agent",
  "agent-tools.js",
);
const INKOS_CORE_AGENT_PROMPT = join(
  PROJECT_ROOT,
  "node_modules",
  "@actalk",
  "inkos-core",
  "dist",
  "agent",
  "agent-system-prompt.js",
);
const INKOS_CORE_LLM_PROVIDER = join(
  PROJECT_ROOT,
  "node_modules",
  "@actalk",
  "inkos-core",
  "dist",
  "llm",
  "provider.js",
);
const INKOS_STUDIO_SERVER = join(
  PROJECT_ROOT,
  "node_modules",
  "@actalk",
  "inkos-studio",
  "dist",
  "api",
  "server.js",
);
const STORY_FORGE_DEFAULT_MODEL = "gpt-5.5";
const STORY_FORGE_DEFAULT_SERVICE = "custom:Yunwu ChatGPT";

export async function loadInkosProjectEnv() {
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

export async function createInkosProcessEnv() {
  const projectEnv = await loadInkosProjectEnv();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
  };

  for (const [key, value] of Object.entries(projectEnv)) {
    env[key] = value;
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

  return env;
}

export function assertInkosInstalled() {
  return existsSync(INKOS_CLI);
}

export async function ensureInkosStudioDefaultModel() {
  let assetNames: string[];

  try {
    assetNames = await readdir(INKOS_STUDIO_ASSETS_DIR);
  } catch {
    return false;
  }

  const assetPath = assetNames
    .filter((name) => /^index-.*\.js$/.test(name))
    .map((name) => join(INKOS_STUDIO_ASSETS_DIR, name))[0];

  if (!assetPath) {
    return false;
  }

  const content = await readFile(assetPath, "utf8");
  const initialState = "selectedModel:null,selectedService:null";
  const patchedState = `selectedModel:${JSON.stringify(STORY_FORGE_DEFAULT_MODEL)},selectedService:${JSON.stringify(STORY_FORGE_DEFAULT_SERVICE)}`;

  if (content.includes(patchedState)) {
    return true;
  }

  if (!content.includes(initialState)) {
    return false;
  }

  await writeFile(assetPath, content.replace(initialState, patchedState), "utf8");
  return true;
}

export async function ensureInkosVietnameseCompatibility() {
  let patched = false;

  try {
    const content = await readFile(INKOS_CORE_AGENT_TOOLS, "utf8");
    let nextContent = content;
    const marker = 'if ("language" in prepared && prepared.language === "vi")';
    const schemaMarker = 'Type.Literal("vi")';
    const languageSchema = `    language: Type.Optional(Type.Union([
        Type.Literal("zh"),
        Type.Literal("en"),
    ], { description: "architect only: writing language. Default: zh" })),`;
    const patchedLanguageSchema = `    language: Type.Optional(Type.Union([
        Type.Literal("zh"),
        Type.Literal("en"),
        Type.Literal("vi"),
        Type.Literal("Tiếng Việt"),
    ], { description: "architect only: writing language. Default: zh. Vietnamese requests are executed with English-compatible internals and Vietnamese output instructions." })),`;
    const platformBlock = `    if ("platform" in prepared) {
        const platform = normalizePlatformId(prepared.platform);
        if (platform) {
            prepared.platform = platform;
        }
        else {
            delete prepared.platform;
        }
    }
`;
    const languagePatch = `${platformBlock}    if ("language" in prepared && prepared.language === "vi") {
        prepared.language = "en";
        const note = "Vietnamese output requested. Use English-compatible InkOS internals, but write all user-facing story content in Vietnamese.";
        prepared.instruction = typeof prepared.instruction === "string"
            ? \`\${note}\\n\\n\${prepared.instruction}\`
            : note;
    }
`;
    const initLanguage = `                            language: (language ?? "zh"),`;
    const patchedInitLanguage = `                            language: (language === "vi" || language === "Tiếng Việt" ? "en" : (language ?? "zh")),`;

    if (!nextContent.includes(schemaMarker) && nextContent.includes(languageSchema)) {
      nextContent = nextContent.replace(languageSchema, patchedLanguageSchema);
      patched = true;
    }

    if (!nextContent.includes(marker) && nextContent.includes(platformBlock)) {
      nextContent = nextContent.replace(platformBlock, languagePatch);
      patched = true;
    }

    if (nextContent.includes(initLanguage)) {
      nextContent = nextContent.replace(initLanguage, patchedInitLanguage);
      patched = true;
    }

    if (nextContent !== content) {
      await writeFile(INKOS_CORE_AGENT_TOOLS, nextContent, "utf8");
    }
  } catch {
    // Optional compatibility patch. Startup should continue if the package changes.
  }

  try {
    const content = await readFile(INKOS_CORE_LLM_PROVIDER, "utf8");
    let nextContent = content;
    const chatStreamTarget = `    const finalContent = content || reasoningContent;
    if (!finalContent) {
        throw wrapLLMError(new Error("LLM returned empty response from stream"), errorCtx);
    }
    return { content: finalContent, usage };
}`;
    const chatStreamReplacement = `    const finalContent = content || reasoningContent;
    if (!finalContent) {
        return chatCompletionViaCustomOpenAICompatible({ ...client, stream: false }, model, messages, resolved, onStreamProgress, undefined, allowSystemRoleFallback);
    }
    return { content: finalContent, usage };
}`;
    const responsesStreamTarget = `        if (!content) {
            throw wrapLLMError(new Error("LLM returned empty response from stream"), errorCtx);
        }
        return { content, usage };
    }
    const payload = {`;
    const responsesStreamReplacement = `        if (!content) {
            return chatCompletionViaCustomOpenAICompatible({ ...client, stream: false }, model, messages, resolved, onStreamProgress, undefined, allowSystemRoleFallback);
        }
        return { content, usage };
    }
    const payload = {`;

    if (nextContent.includes(chatStreamTarget)) {
      nextContent = nextContent.replace(chatStreamTarget, chatStreamReplacement);
      patched = true;
    }

    if (nextContent.includes(responsesStreamTarget)) {
      nextContent = nextContent.replace(responsesStreamTarget, responsesStreamReplacement);
      patched = true;
    }

    nextContent = nextContent.replace(
      /if \(!content\) \{\s+throw wrapLLMError\(new Error\("LLM returned empty response from stream"\), errorCtx\);\s+\}\s+if \(!usage\.totalTokens\)/g,
      'if (!content) {\n        return chatCompletionViaCustomAnthropicCompatible({ ...client, stream: false }, model, messages, resolved, onStreamProgress, undefined);\n    }\n    if (!usage.totalTokens)',
    );

    nextContent = nextContent.replace(
      /throw new Error\(`LLM returned empty response from stream \(\$\{diag\}\)`\);/g,
      "return chatCompletionViaPiAi({ ...client, stream: false }, model, messages, resolved, onStreamProgress, undefined);",
    );

    if (nextContent !== content) {
      await writeFile(INKOS_CORE_LLM_PROVIDER, nextContent, "utf8");
    }
  } catch {
    // Optional runtime patch. Startup should continue if the package changes.
  }

  try {
    const content = await readFile(INKOS_STUDIO_SERVER, "utf8");
    const marker = "viet\\s+chuong";
    const replacement = `function isWriteNextInstruction(instruction) {
    const trimmed = instruction.trim();
    const normalized = trimmed
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .toLowerCase();
    return /^(continue|ç»§ç»­|ç»§ç»­å†™|å†™ä¸‹ä¸€ç« |write next|ä¸‹ä¸€ç« |å†æ¥ä¸€ç« )$/i.test(trimmed)
        || /(ç»§ç»­å†™|å†™ä¸‹ä¸€ç« |ä¸‹ä¸€ç« |å†æ¥ä¸€ç« |write\\s+next)/i.test(trimmed)
        || /\\b(viet\\s+(tiep\\s+)?chuong|viet\\s+chuong\\s+\\d+|chuong\\s+\\d+|tiep\\s+tuc\\s+viet|viet\\s+tiep)\\b/i.test(normalized);
}`;

    if (!content.includes(marker)) {
      const nextContent = content.replace(
        /function isWriteNextInstruction\(instruction\) \{[\s\S]*?\n\}/,
        replacement,
      );

      if (nextContent !== content) {
        await writeFile(INKOS_STUDIO_SERVER, nextContent, "utf8");
        patched = true;
      }
    }
  } catch {
    // Optional compatibility patch. Startup should continue if the package changes.
  }

  try {
    const content = await readFile(INKOS_CORE_AGENT_PROMPT, "utf8");
    const marker = "Vietnamese compatibility:";
    const target = `   - Pass structured params: genre, platform, language, targetChapters, chapterWordCount
   - Include all collected info in the instruction
   - The architect will generate the complete foundation`;
    const replacement = `   - Pass structured params: genre, platform, language, targetChapters, chapterWordCount
   - Vietnamese compatibility: if the user wants Vietnamese, set language="en" and explicitly state in instruction that all story-facing content must be written in Vietnamese
   - Include all collected info in the instruction
   - The architect will generate the complete foundation`;

    if (!content.includes(marker) && content.includes(target)) {
      await writeFile(INKOS_CORE_AGENT_PROMPT, content.replace(target, replacement), "utf8");
      patched = true;
    }
  } catch {
    // Optional compatibility patch. Startup should continue if the package changes.
  }

  return patched;
}
