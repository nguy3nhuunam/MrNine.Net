import { NextRequest, NextResponse } from "next/server";
import { Agent } from "undici";
import { requireAuth } from "@/lib/require-auth";

const INKOS_API_BASE = "http://127.0.0.1:4567/api/v1";
const longRunningInkosDispatcher = new Agent({
  bodyTimeout: 0,
  headersTimeout: 0,
});
const AGENT_SYNC_WINDOW_MS = 25_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxyInkosApi(request: NextRequest, context: RouteContext) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const { path = [] } = await context.params;
  const targetUrl = new URL(`${INKOS_API_BASE}/${path.map(encodeURIComponent).join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("expect");

  const method = request.method.toUpperCase();
  const requestBody = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const init: RequestInit & { dispatcher?: Agent } = {
    method,
    headers,
    body: requestBody,
    cache: "no-store",
    dispatcher: longRunningInkosDispatcher,
  };
  const upstreamPromise = fetch(targetUrl, init);

  if (method === "POST" && path.join("/") === "agent") {
    const syncResult = await Promise.race([
      upstreamPromise.then((upstream) => ({ upstream })),
      new Promise<{ upstream: null }>((resolve) => {
        setTimeout(() => resolve({ upstream: null }), AGENT_SYNC_WINDOW_MS);
      }),
    ]);

    if (!syncResult.upstream) {
      upstreamPromise.catch(() => undefined);
      const sessionId = readSessionIdFromJsonBody(requestBody);

      return NextResponse.json(
        {
          response:
            "Đang xử lý tác vụ dài trong nền. Story Forge sẽ tự cập nhật khi tạo xong foundation.",
          session: {
            ...(sessionId ? { sessionId } : {}),
          },
          pending: true,
        },
        { status: 202 },
      );
    }

    return toNextResponse(syncResult.upstream);
  }

  const upstream = await upstreamPromise;
  return toNextResponse(upstream);
}

function toNextResponse(upstream: Response) {
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function readSessionIdFromJsonBody(body: ArrayBuffer | undefined) {
  if (!body) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body).toString("utf8")) as { sessionId?: unknown };
    return typeof parsed.sessionId === "string" ? parsed.sessionId : undefined;
  } catch {
    return undefined;
  }
}

export {
  proxyInkosApi as DELETE,
  proxyInkosApi as GET,
  proxyInkosApi as PATCH,
  proxyInkosApi as POST,
  proxyInkosApi as PUT,
};
