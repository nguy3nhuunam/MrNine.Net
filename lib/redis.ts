/**
 * Singleton Redis client cho WebAI — share cùng instance với gateway.
 *
 * ENV: REDIS_URL=redis://host:port/db (default redis://localhost:6380/0)
 *
 * Lazy init — không kết nối nếu route không gọi.
 */
import "server-only";

import IORedis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __mrnine_redis: IORedis | null | undefined;
}

export function getRedis(): IORedis {
  if (globalThis.__mrnine_redis) return globalThis.__mrnine_redis;
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6380/0";
  const client = new IORedis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });
  client.on("error", (err) => console.error("[redis]", err.message));
  globalThis.__mrnine_redis = client;
  return client;
}
