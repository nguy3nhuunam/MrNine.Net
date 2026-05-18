import { NextRequest, NextResponse } from "next/server";
import { Agent } from "undici";

const INKOS_AGENT_URL = "http://127.0.0.1:4567/api/v1/agent";
const longRunningInkosDispatcher = new Agent({
  bodyTimeout: 0,
  headersTimeout: 0,
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("expect");

  const requestBody = await request.arrayBuffer();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(" "));
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(" "));
      }, 10_000);

      try {
        const upstream = await fetch(INKOS_AGENT_URL, {
          method: "POST",
          headers,
          body: requestBody,
          cache: "no-store",
          dispatcher: longRunningInkosDispatcher,
        } as RequestInit & { dispatcher: Agent });
        const body = await upstream.arrayBuffer();
        controller.enqueue(new Uint8Array(body));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              error: { code: "INKOS_AGENT_PROXY_ERROR", message },
              response: message,
              session: readSessionPayload(requestBody),
            }),
          ),
        );
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function readSessionPayload(body: ArrayBuffer): Record<string, string> {
  try {
    const parsed = JSON.parse(Buffer.from(body).toString("utf8")) as {
      activeBookId?: unknown;
      sessionId?: unknown;
    };

    return {
      ...(typeof parsed.sessionId === "string" ? { sessionId: parsed.sessionId } : {}),
      ...(typeof parsed.activeBookId === "string" ? { activeBookId: parsed.activeBookId } : {}),
    };
  } catch {
    return {};
  }
}
