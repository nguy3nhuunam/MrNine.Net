import { NextResponse } from "next/server";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 60;

type Kind = "crypto" | "metal" | "forex";

type AssetDef = {
  id: string;
  symbol: string;
  name: string;
  kind: Kind;
};

// Top 10 crypto by recognition + gold via PAXG (1 token = 1 troy ounce gold).
const CG_ASSETS: AssetDef[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", kind: "crypto" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", kind: "crypto" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", kind: "crypto" },
  { id: "solana", symbol: "SOL", name: "Solana", kind: "crypto" },
  { id: "ripple", symbol: "XRP", name: "XRP", kind: "crypto" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", kind: "crypto" },
  { id: "cardano", symbol: "ADA", name: "Cardano", kind: "crypto" },
  { id: "tron", symbol: "TRX", name: "TRON", kind: "crypto" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", kind: "crypto" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin", kind: "crypto" },
  { id: "pax-gold", symbol: "XAU", name: "Vàng (PAXG)", kind: "metal" },
];

type CGMarket = {
  id: string;
  current_price: number;
  price_change_percentage_24h?: number | null;
  sparkline_in_7d?: { price?: number[] };
};

type ForexResponse = {
  result?: string;
  rates?: Record<string, number>;
};

type GoldApiResponse = {
  price?: number;
  prev_close_price?: number;
  open_price?: number;
};

export type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  kind: Kind;
  usd: number;
  vnd: number;
  change24h: number | null;
  sparkline: number[];
};

async function _handler_GET() {
  const ids = CG_ASSETS.map((a) => a.id).join(",");
  const cgUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`;

  const [marketsRes, forexRes, silverRes] = await Promise.all([
    fetch(cgUrl, { next: { revalidate: 60 }, headers: { Accept: "application/json" } }).catch(() => null),
    fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 600 } }).catch(() => null),
    fetch("https://api.gold-api.com/price/XAG", { next: { revalidate: 300 } }).catch(() => null),
  ]);

  let usdToVnd = 25500;
  if (forexRes && forexRes.ok) {
    const data = (await forexRes.json().catch(() => null)) as ForexResponse | null;
    if (data?.rates?.VND) usdToVnd = data.rates.VND;
  }

  const rows: MarketRow[] = [];

  if (marketsRes && marketsRes.ok) {
    const data = (await marketsRes.json().catch(() => null)) as CGMarket[] | null;
    if (Array.isArray(data)) {
      for (const def of CG_ASSETS) {
        const entry = data.find((d) => d.id === def.id);
        if (!entry) continue;
        const usd = entry.current_price;
        rows.push({
          id: def.id,
          symbol: def.symbol,
          name: def.name,
          kind: def.kind,
          usd,
          vnd: usd * usdToVnd,
          change24h: entry.price_change_percentage_24h ?? null,
          sparkline: Array.isArray(entry.sparkline_in_7d?.price) ? entry.sparkline_in_7d!.price!.slice() : [],
        });
      }
    }
  }

  // Silver: gold-api.com gives spot price + previous close. No 7d history available
  // for free, so we generate a smooth approximation from open + current.
  if (silverRes && silverRes.ok) {
    const silverData = (await silverRes.json().catch(() => null)) as GoldApiResponse | null;
    if (silverData?.price) {
      const usd = silverData.price;
      const prev = silverData.prev_close_price ?? silverData.open_price ?? usd;
      const change = prev ? ((usd - prev) / prev) * 100 : null;
      // synth sparkline: 24 points easing from prev → current with gentle noise.
      const points = 24;
      const synth: number[] = [];
      for (let i = 0; i < points; i += 1) {
        const t = i / (points - 1);
        const base = prev + (usd - prev) * t;
        const wobble = Math.sin(i * 0.7) * Math.abs(usd - prev) * 0.18;
        synth.push(base + wobble);
      }
      rows.push({
        id: "silver",
        symbol: "XAG",
        name: "Bạc",
        kind: "metal",
        usd,
        vnd: usd * usdToVnd,
        change24h: change,
        sparkline: synth,
      });
    }
  }

  // Forex pairs vs VND. Exchange-Rate-API free tier gives latest rates per base
  // currency with no 7d history, so the sparkline is a flat-ish synth so the
  // card visual still has a chart strip.
  if (forexRes && forexRes.ok) {
    // Re-fetch isn't needed — we already consumed forexRes above. Move USD → VND
    // forex card here using the same usdToVnd we already extracted.
    const synth = synthFlatSparkline(usdToVnd, 0.004);
    rows.push({
      id: "forex-usd-vnd",
      symbol: "USD",
      name: "USD / VND",
      kind: "forex",
      usd: 1,
      vnd: usdToVnd,
      change24h: null,
      sparkline: synth,
    });
  }

  // CNY/VND and TWD/VND need their own base lookups.
  const [cnyRes, twdRes] = await Promise.all([
    fetch("https://open.er-api.com/v6/latest/CNY", { next: { revalidate: 600 } }).catch(() => null),
    fetch("https://open.er-api.com/v6/latest/TWD", { next: { revalidate: 600 } }).catch(() => null),
  ]);

  const cnyToVnd = await readRateToVnd(cnyRes);
  if (cnyToVnd) {
    rows.push({
      id: "forex-cny-vnd",
      symbol: "CNY",
      name: "CNY / VND",
      kind: "forex",
      usd: cnyToVnd / usdToVnd,
      vnd: cnyToVnd,
      change24h: null,
      sparkline: synthFlatSparkline(cnyToVnd, 0.004),
    });
  }

  const twdToVnd = await readRateToVnd(twdRes);
  if (twdToVnd) {
    rows.push({
      id: "forex-twd-vnd",
      symbol: "TWD",
      name: "TWD / VND",
      kind: "forex",
      usd: twdToVnd / usdToVnd,
      vnd: twdToVnd,
      change24h: null,
      sparkline: synthFlatSparkline(twdToVnd, 0.005),
    });
  }

  return NextResponse.json({
    rows,
    usdToVnd,
    updatedAt: new Date().toISOString(),
  });
}

export const GET = safeJsonRoute(_handler_GET);

function synthFlatSparkline(target: number, jitter: number): number[] {
  const points = 24;
  const out: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const wobble = Math.sin(i * 0.9) * target * jitter + Math.cos(i * 0.5) * target * (jitter * 0.6);
    out.push(target * (1 - jitter * 0.5 + jitter * t) + wobble);
  }
  return out;
}

async function readRateToVnd(res: Response | null): Promise<number | null> {
  if (!res || !res.ok) return null;
  const data = (await res.json().catch(() => null)) as ForexResponse | null;
  const v = data?.rates?.VND;
  return typeof v === "number" && v > 0 ? v : null;
}
