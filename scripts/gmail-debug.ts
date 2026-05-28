/**
 * Debug: list mọi email gần đây từ Gmail account đã authorize.
 * Mục đích: xác nhận đúng inbox, xem MB gửi từ địa chỉ nào.
 */
import "dotenv/config";
import { google } from "googleapis";

async function main() {
  const oauth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob",
  );
  oauth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth: oauth });

  const profile = await gmail.users.getProfile({ userId: "me" });
  console.log(`✓ Authorized as: ${profile.data.emailAddress}`);
  console.log(`  Total messages: ${profile.data.messagesTotal}`);

  // Show senders của email MB
  const r = await gmail.users.messages.list({
    userId: "me",
    q: "from:mbbank.com.vn newer_than:30d",
    maxResults: 5,
  });
  console.log("\nEmails từ MB:");
  for (const m of r.data.messages ?? []) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });
    const headers = full.data.payload?.headers ?? [];
    const from = headers.find((h) => h.name === "From")?.value;
    const subj = headers.find((h) => h.name === "Subject")?.value;
    const date = headers.find((h) => h.name === "Date")?.value;
    console.log(`  From: ${from}`);
    console.log(`  Subj: ${subj}`);
    console.log(`  Date: ${date}`);
    console.log("  ---");
  }
}

main().catch(console.error);
