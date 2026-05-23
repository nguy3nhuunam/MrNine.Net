import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

const PROJECT_ROOT = process.cwd();
const PIXELLE_DIR = join(PROJECT_ROOT, ".webai-pixelle-video");
const PIXELLE_REPO = "https://github.com/AIDC-AI/Pixelle-Video.git";
const STUDIO_PORT = 8501;
const STUDIO_URL = `http://127.0.0.1:${STUDIO_PORT}`;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

declare global {
  var webaiPixelleVideoProcess: ChildProcess | undefined;
  var webaiPixelleVideoLastLog: string | undefined;
}

function runCommand(command: string, args: string[], timeoutMs = 30_000): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      resolve({ ok: false, stdout, stderr: stderr || "Command timed out." });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ ok: false, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ ok: code === 0, stdout, stderr });
    });
  });
}

async function isStudioReady() {
  try {
    const response = await fetch(`${STUDIO_URL}/_stcore/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function hasCommand(command: string, args: string[] = ["--version"]) {
  const result = await runCommand(command, args, 8_000);
  return result.ok;
}

async function ensureRepo() {
  if (existsSync(join(PIXELLE_DIR, "web", "app.py"))) {
    return;
  }

  const result = await runCommand(
    "git",
    ["clone", "--depth", "1", PIXELLE_REPO, PIXELLE_DIR],
    120_000,
  );

  if (!result.ok) {
    throw new Error(result.stderr || "Failed to clone Pixelle-Video.");
  }
}

async function ensureRuntimeFiles() {
  await mkdir(join(PIXELLE_DIR, ".streamlit"), { recursive: true });

  const configPath = join(PIXELLE_DIR, "config.yaml");
  const examplePath = join(PIXELLE_DIR, "config.example.yaml");

  if (!existsSync(configPath) && existsSync(examplePath)) {
    await copyFile(examplePath, configPath);
  }

  await writeFile(
    join(PIXELLE_DIR, ".streamlit", "config.toml"),
    [
      "[theme]",
      'base = "dark"',
      'primaryColor = "#ef4444"',
      'backgroundColor = "#0b0a08"',
      'secondaryBackgroundColor = "#14100d"',
      'textColor = "#f4eadc"',
      'font = "sans serif"',
      "",
      "[server]",
      "headless = true",
      "enableCORS = false",
      "enableXsrfProtection = false",
      "",
      "[browser]",
      "gatherUsageStats = false",
      "",
    ].join("\n"),
    "utf8",
  );
}

async function getRuntimeStatus() {
  if (await isStudioReady()) {
    return {
      ok: true,
      installed: true,
      status: "ready",
      url: STUDIO_URL,
      message: "Pixelle-Video Studio is ready.",
    };
  }

  if (!(await hasCommand("git"))) {
    return {
      ok: false,
      installed: false,
      status: "missing-git",
      url: STUDIO_URL,
      message: "Git is required to clone Pixelle-Video.",
    };
  }

  if (!(await hasCommand("uv"))) {
    return {
      ok: false,
      installed: false,
      status: "missing-uv",
      url: STUDIO_URL,
      message: "uv is required to run Pixelle-Video dependencies.",
      installCommands: ["winget install astral-sh.uv"],
    };
  }

  return {
    ok: false,
    installed: true,
    status: existsSync(join(PIXELLE_DIR, "web", "app.py")) ? "offline" : "missing-repo",
    url: STUDIO_URL,
    message: "Pixelle-Video is available but the local Studio server is offline.",
  };
}

export async function POST() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const status = await getRuntimeStatus();

  if (status.status === "ready") {
    return NextResponse.json(status);
  }

  if (!status.installed) {
    return NextResponse.json(status);
  }

  const existing = globalThis.webaiPixelleVideoProcess;

  if (existing && !existing.killed) {
    return NextResponse.json({
      ...status,
      ok: true,
      status: "starting",
      message: "Pixelle-Video Studio is already starting.",
      log: globalThis.webaiPixelleVideoLastLog,
    });
  }

  try {
    globalThis.webaiPixelleVideoLastLog = "Preparing Pixelle-Video runtime...";
    await ensureRepo();
    await ensureRuntimeFiles();
  } catch (error) {
    return NextResponse.json({
      ok: false,
      installed: false,
      status: "setup-error",
      url: STUDIO_URL,
      message: error instanceof Error ? error.message : "Pixelle-Video setup failed.",
      log: globalThis.webaiPixelleVideoLastLog,
    });
  }

  const child = spawn(
    "uv",
    [
      "run",
      "streamlit",
      "run",
      "web/app.py",
      "--server.address",
      "127.0.0.1",
      "--server.port",
      String(STUDIO_PORT),
      "--server.headless",
      "true",
      "--browser.gatherUsageStats",
      "false",
    ],
    {
      cwd: PIXELLE_DIR,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  child.stdout.on("data", (chunk: Buffer) => {
    globalThis.webaiPixelleVideoLastLog = chunk.toString().slice(-2_000);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    globalThis.webaiPixelleVideoLastLog = chunk.toString().slice(-2_000);
  });
  child.on("close", () => {
    if (globalThis.webaiPixelleVideoProcess === child) {
      globalThis.webaiPixelleVideoProcess = undefined;
    }
  });

  globalThis.webaiPixelleVideoProcess = child;

  return NextResponse.json({
    ok: true,
    installed: true,
    status: "starting",
    url: STUDIO_URL,
    message: "Pixelle-Video Studio is starting. The first run may install Python dependencies.",
  });
}

export async function GET() {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const status = await getRuntimeStatus();

  return NextResponse.json({
    ...status,
    log: globalThis.webaiPixelleVideoLastLog,
  });
}
