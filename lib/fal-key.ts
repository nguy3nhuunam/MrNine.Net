// Single source of truth for the FAL API key. Reads from env vars only —
// no embedded fallback, since this is a public repo. Throws a clear error
// if neither env var is set, so missing config fails loud rather than
// silently using a leaked key.

export function getFalKey(): string {
  const key = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!key) {
    throw new Error("FAL_KEY hoặc FAL_API_KEY chưa cấu hình trong env.");
  }
  return key;
}
