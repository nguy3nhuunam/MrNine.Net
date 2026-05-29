import "server-only";

import { randomBytes } from "node:crypto";
import { generateSecret as makeSecret, generateURI, verifySync } from "otplib";

const OPTIONS = { step: 30, digits: 6, algorithm: "sha1" as const };

export function generateSecret(): string {
  return makeSecret({ length: 20 });
}

export function buildAuthUri(email: string, secret: string): string {
  return generateURI({
    secret,
    label: email,
    issuer: "MrNine",
    ...OPTIONS,
  });
}

export function verifyToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const t = token.replace(/\s/g, "");
  const r = verifySync({ token: t, secret, ...OPTIONS }) as unknown;
  if (typeof r === "boolean") return r;
  if (r && typeof r === "object" && (r as { valid?: boolean }).valid === true) return true;
  return false;
}

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function consumeRecoveryCode(
  input: string,
  codes: string[] | null | undefined,
): { ok: boolean; remaining: string[] } {
  if (!codes || codes.length === 0) return { ok: false, remaining: [] };
  const norm = input.trim().toUpperCase();
  const idx = codes.indexOf(norm);
  if (idx < 0) return { ok: false, remaining: codes };
  const remaining = codes.slice(0, idx).concat(codes.slice(idx + 1));
  return { ok: true, remaining };
}
