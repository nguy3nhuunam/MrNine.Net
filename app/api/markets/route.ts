import { NextResponse } from "next/server";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 60;

type CoinSymbol = "bitcoin" | "ethereum" | "binancecoin" | "solana" | "dogecoin" | "ripple" | "pax-gold";

const COINS: Array<{ id: CoinSymbol; symbol: string; name: string; kind: "crypto" | "metal" }> = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", kind: "crypto" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", kind: "crypto" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", kind: "crypto" },
  { id: "solana", symbol: "SOL", name: "Solana", kind: "crypto" },
  { id: "ripple", symbol: "XRP", name: "XRP", kind: "crypto" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", kind: "crypto" },
  { id: "pax-gold", symbol: "XAU", name: "Vàng (PAXG)", kind: "metal" },
];

type CoinGeckoResponse = Record<string, { usd: number; vnd: number; usd_24h_change?: number; vnd_24h_change?: number }>;

type ForexResponse = {
  result: string;
  rates?: Record<string, number>;
};

export type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  kind: "crypto" | "metal" | "forex";
  usd: number;
  vnd: number;
  change24h: number | null;
};

async function _handler_GET() {
  const ids = COINS.map((coin) => coin.id).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,vnd&include_24hr_change=true`;

  const [pricesRes, forexRes] = await Promise.all([
    fetch(url, { next: { revalidate: 60 }, headers: { Accept: "application/json" } }).catch(() => null),
    fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 600 } }).catch(() => null),
  ]);

  const rows: MarketRow[] = [];
  let usdToVnd = 25500;

  if (pricesRes && pricesRes.ok) {
    const data = (await pricesRes.json().catch(() => null)) as CoinGeckoResponse | null;
    if (data) {
      for (const coin of COINS) {
        const entry = data[coin.id];
        if (!entry) continue;
        rows.push({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          kind: coin.kind,
          usd: entry.usd,
          vnd: entry.vnd,
          change24h: entry.usd_24h_change ?? null,
        });
      }
    }
  }

  if (forexRes && forexRes.ok) {
    const data = (await forexRes.json().catch(() => null)) as ForexResponse | null;
    if (data?.rates?.VND) usdToVnd = data.rates.VND;
  }

  return NextResponse.json({
    rows,
    usdToVnd,
    updatedAt: new Date().toISOString(),
  });
}

export const GET = safeJsonRoute(_handler_GET);
