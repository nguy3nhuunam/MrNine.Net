/**
 * SHA-256 key hashing — phải khớp byte-for-byte với app/security.py
 * (Python: hashlib.sha256(plaintext.encode("utf-8")).hexdigest())
 */
import { createHash, randomBytes } from "node:crypto";

export const KEY_PREFIX = "sk-mrnine-";

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  // 32-byte URL-safe base64 (matches secrets.token_urlsafe(32) trên Python)
  const body = randomBytes(32)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const plaintext = `${KEY_PREFIX}${body}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: prefixDisplay(plaintext),
  };
}

export function prefixDisplay(plaintext: string): string {
  if (plaintext.length < 4) return `${KEY_PREFIX}***`;
  return `${KEY_PREFIX}***${plaintext.slice(-4)}`;
}
