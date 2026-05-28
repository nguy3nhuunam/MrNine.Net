"use strict";
/**
 * One-time Gmail OAuth bootstrap.
 *
 * Cách chạy (sau khi đã có GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET):
 *   tsx scripts/gmail-authorize.ts
 *
 * Script sẽ in URL → bạn mở URL trên browser → grant Gmail readonly →
 * Google show 1 mã code → paste vào terminal → script in refresh_token →
 * paste vào .env.local → done.
 */
import { google } from "googleapis";
import * as readline from "node:readline/promises";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

async function main() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Cần set GMAIL_CLIENT_ID và GMAIL_CLIENT_SECRET trong .env.local trước.");
    process.exit(1);
  }
  const oauth = new google.auth.OAuth2(clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob");
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  console.log("\n1) Mở URL sau trên browser, đăng nhập bằng Gmail nhận biên lai MB:\n");
  console.log(url);
  console.log("\n2) Grant scope → Google show 1 mã code → copy mã đó.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question("Paste authorization code: ")).trim();
  rl.close();

  const { tokens } = await oauth.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      "\nKhông nhận được refresh_token. Có thể do app đã được grant trước. " +
        "Vào https://myaccount.google.com/permissions → revoke app → chạy lại.",
    );
    process.exit(1);
  }
  console.log("\n✓ Refresh token (paste vào .env.local):\n");
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
