"use client";

import { useEffect, useMemo, useState } from "react";

type Endpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  sample: object | null;
  streamable: boolean;
};

type Config = {
  base_url: string;
  endpoints: Endpoint[];
};

export function PlaygroundClient() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [endpointId, setEndpointId] = useState<string>("chat.completions");
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState("{}");
  const [stream, setStream] = useState(false);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [latency, setLatency] = useState<number | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/playground")
      .then((r) => r.json())
      .then((d: Config) => {
        setCfg(d);
        const first = d.endpoints[0];
        if (first?.sample) setBody(JSON.stringify(first.sample, null, 2));
      });
  }, []);

  const endpoint = useMemo(
    () => cfg?.endpoints.find((e) => e.id === endpointId) ?? null,
    [cfg, endpointId],
  );

  function onPickEndpoint(id: string) {
    setEndpointId(id);
    const ep = cfg?.endpoints.find((e) => e.id === id);
    if (ep?.sample) setBody(JSON.stringify(ep.sample, null, 2));
    else setBody("{}");
    setStream(false);
  }

  async function onSend() {
    if (!cfg || !endpoint) return;
    if (!apiKey.startsWith("sk-mrnine-")) {
      alert("Cần nhập API key dạng sk-mrnine-…");
      return;
    }
    setBusy(true);
    setOutput("");
    setHeaders({});
    setStatusCode(null);
    setLatency(null);

    const url = cfg.base_url + endpoint.path;
    const init: RequestInit = {
      method: endpoint.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (endpoint.method === "POST") {
      try {
        const parsed = JSON.parse(body);
        if (stream && endpoint.streamable) parsed.stream = true;
        init.body = JSON.stringify(parsed);
      } catch (e) {
        setOutput(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
        setBusy(false);
        return;
      }
    }

    const t0 = performance.now();
    try {
      const res = await fetch(url, init);
      setStatusCode(res.status);
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        if (k.toLowerCase().startsWith("x-mrnine") || k.toLowerCase() === "content-type") {
          respHeaders[k] = v;
        }
      });
      setHeaders(respHeaders);

      if (stream && endpoint.streamable && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setOutput(acc);
        }
      } else {
        const text = await res.text();
        try {
          setOutput(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setOutput(text);
        }
      }
    } catch (e) {
      setOutput(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLatency(Math.round(performance.now() - t0));
      setBusy(false);
    }
  }

  if (!cfg) return <p className="font-mono text-xs text-[#5d544a]">Đang tải…</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">Endpoint</span>
          <select
            value={endpointId}
            onChange={(e) => onPickEndpoint(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          >
            {cfg.endpoints.map((e) => (
              <option key={e.id} value={e.id}>
                {e.method} {e.path}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">
            API key (paste sk-mrnine-…)
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-mrnine-..."
            className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2.5 font-mono text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
        </label>
      </div>

      {endpoint?.method === "POST" ? (
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">
              Body (JSON)
            </span>
            {endpoint.streamable ? (
              <label className="flex items-center gap-2 font-mono text-[0.65rem] text-[#dff8e4]">
                <input
                  type="checkbox"
                  checked={stream}
                  onChange={(e) => setStream(e.target.checked)}
                />
                stream
              </label>
            ) : null}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2.5 font-mono text-xs text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
            spellCheck={false}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSend}
          disabled={busy}
          className="rounded-lg bg-[#ef4444] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.24em] text-[#090807] hover:bg-[#dc2626] disabled:opacity-50"
        >
          {busy ? "Đang gọi…" : "Send"}
        </button>
        {statusCode !== null ? (
          <span
            className={
              "rounded-full px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] " +
              (statusCode < 300
                ? "bg-[#45a85d]/15 text-[#dff8e4]"
                : "bg-[#ef4444]/15 text-[#ef4444]")
            }
          >
            HTTP {statusCode}
          </span>
        ) : null}
        {latency !== null ? (
          <span className="font-mono text-[0.65rem] text-[#9a9087]">{latency}ms</span>
        ) : null}
        {headers["x-mrnine-request-id"] ? (
          <span className="font-mono text-[0.6rem] text-[#5d544a]">
            req {headers["x-mrnine-request-id"].slice(0, 12)}
          </span>
        ) : null}
      </div>

      <pre className="max-h-[480px] overflow-auto rounded-xl border border-white/8 bg-[#0c0a08] p-4 font-mono text-xs text-[#dff8e4]">
        {output || "(response sẽ hiện ở đây)"}
      </pre>
    </div>
  );
}
