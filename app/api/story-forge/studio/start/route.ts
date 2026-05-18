import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  assertInkosInstalled,
  createInkosProcessEnv,
  ensureInkosStudioDefaultModel,
  ensureInkosVietnameseCompatibility,
  INKOS_CLI,
  INKOS_PROJECT_DIR,
} from "@/lib/inkos-runtime";

const STUDIO_PORT = 4567;
const STUDIO_URL = `http://127.0.0.1:${STUDIO_PORT}`;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

declare global {
  var webaiInkosStudioProcess: ChildProcess | undefined;
}

async function isStudioReady() {
  try {
    const response = await fetch(`${STUDIO_URL}/api/v1/project`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST() {
  if (!assertInkosInstalled()) {
    return NextResponse.json(
      { ok: false, message: "InkOS is not installed. Run npm install first." },
      { status: 500 },
    );
  }

  await mkdir(INKOS_PROJECT_DIR, { recursive: true });
  await ensureInkosStudioDefaultModel();
  await ensureInkosVietnameseCompatibility();

  if (await isStudioReady()) {
    return NextResponse.json({ ok: true, status: "ready", url: "/inkos-studio/" });
  }

  const existing = globalThis.webaiInkosStudioProcess;

  if (existing && !existing.killed) {
    return NextResponse.json({ ok: true, status: "starting", url: "/inkos-studio/" });
  }

  const child = spawn(process.execPath, [INKOS_CLI, "studio", "--port", String(STUDIO_PORT)], {
    cwd: INKOS_PROJECT_DIR,
    env: await createInkosProcessEnv(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", () => undefined);
  child.stderr.on("data", () => undefined);
  child.on("close", () => {
    if (globalThis.webaiInkosStudioProcess === child) {
      globalThis.webaiInkosStudioProcess = undefined;
    }
  });

  globalThis.webaiInkosStudioProcess = child;

  return NextResponse.json({ ok: true, status: "starting", url: "/inkos-studio/" });
}

export async function GET() {
  return NextResponse.json({
    ok: await isStudioReady(),
    status: await isStudioReady() ? "ready" : "offline",
    url: "/inkos-studio/",
  });
}
