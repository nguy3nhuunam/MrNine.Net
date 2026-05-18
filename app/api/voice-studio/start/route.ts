import { spawn, type ChildProcess } from "node:child_process";
import { NextResponse } from "next/server";

const STUDIO_PORT = 7861;
const STUDIO_URL = `http://127.0.0.1:${STUDIO_PORT}`;
const STUDIO_FRAME_URL = "/voice-studio-runtime/";
const STUDIO_ROOT_PATH = "/voice-studio-runtime";
const INSTALL_COMMANDS = [
  "py -3.10 -m pip install torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cu128",
  "py -3.10 -m pip install omnivoice",
];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PythonRuntime = {
  command: string;
  args: string[];
  label: string;
};

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

declare global {
  var webaiOmniVoiceProcess: ChildProcess | undefined;
  var webaiOmniVoiceLastLog: string | undefined;
}

function runCommand(command: string, args: string[], timeoutMs = 10_000): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
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
    const response = await fetch(STUDIO_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function resolvePython(): Promise<PythonRuntime | null> {
  const candidates: PythonRuntime[] = [
    { command: "py", args: ["-3.10"], label: "Python 3.10" },
    { command: "python", args: [], label: "Python" },
  ];

  for (const candidate of candidates) {
    const result = await runCommand(candidate.command, [...candidate.args, "--version"], 5_000);

    if (result.ok) {
      return candidate;
    }
  }

  return null;
}

async function getRuntimeStatus() {
  if (await isStudioReady()) {
    return {
      ok: true,
      installed: true,
      status: "ready",
      url: STUDIO_FRAME_URL,
      message: "OmniVoice Studio is ready.",
    };
  }

  const python = await resolvePython();

  if (!python) {
    return {
      ok: false,
      installed: false,
      status: "missing-python",
      url: STUDIO_FRAME_URL,
      message: "Python 3.10+ is required before OmniVoice can run.",
      installCommands: INSTALL_COMMANDS,
    };
  }

  const importCheck = await runCommand(
    python.command,
    [...python.args, "-c", "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('omnivoice') else 1)"],
    12_000,
  );

  if (!importCheck.ok) {
    return {
      ok: false,
      installed: false,
      status: "missing-omnivoice",
      url: STUDIO_FRAME_URL,
      python: python.label,
      message: "OmniVoice is not installed in the detected Python runtime.",
      installCommands: INSTALL_COMMANDS,
    };
  }

  return {
    ok: false,
    installed: true,
    status: "offline",
    url: STUDIO_FRAME_URL,
    python: python.label,
    message: "OmniVoice is installed but the local Studio server is offline.",
  };
}

export async function POST() {
  const status = await getRuntimeStatus();

  if (status.status === "ready") {
    return NextResponse.json(status);
  }

  if (!status.installed) {
    return NextResponse.json(status);
  }

  const existing = globalThis.webaiOmniVoiceProcess;

  if (existing && !existing.killed) {
    return NextResponse.json({
      ...status,
      ok: true,
      status: "starting",
      message: "OmniVoice Studio is already starting.",
    });
  }

  const python = await resolvePython();

  if (!python) {
    return NextResponse.json({
      ok: false,
      installed: false,
      status: "missing-python",
      message: "Python 3.10+ is required before OmniVoice can run.",
      installCommands: INSTALL_COMMANDS,
    });
  }

  const child = spawn(
    python.command,
    [
      ...python.args,
      "-m",
      "omnivoice.cli.demo",
      "--ip",
      "127.0.0.1",
      "--port",
      String(STUDIO_PORT),
      "--root-path",
      STUDIO_ROOT_PATH,
    ],
    {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  child.stdout.on("data", (chunk: Buffer) => {
    globalThis.webaiOmniVoiceLastLog = chunk.toString().slice(-1_000);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    globalThis.webaiOmniVoiceLastLog = chunk.toString().slice(-1_000);
  });
  child.on("close", () => {
    if (globalThis.webaiOmniVoiceProcess === child) {
      globalThis.webaiOmniVoiceProcess = undefined;
    }
  });

  globalThis.webaiOmniVoiceProcess = child;

  return NextResponse.json({
    ok: true,
    installed: true,
    status: "starting",
    url: STUDIO_FRAME_URL,
    message: "OmniVoice Studio is starting. The first run may download model files.",
  });
}

export async function GET() {
  const status = await getRuntimeStatus();

  return NextResponse.json({
    ...status,
    log: globalThis.webaiOmniVoiceLastLog,
  });
}
