import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import clientPromise from "@/lib/mongodb";
import { db } from "@/lib/pg/db";
import { users } from "@/lib/pg/schema";
import { sendMail } from "@/lib/email/resend";

const hasMongo = Boolean(clientPromise);
const hasResend = Boolean(process.env.RESEND_API_KEY);

const APP_URL = process.env.APP_URL ?? "https://mrnine.net";

const magicLinkProvider = Nodemailer({
  // Tắt SMTP — dùng Resend HTTP API qua sendVerificationRequest custom.
  server: { host: "unused", port: 1, auth: { user: "", pass: "" } },
  from: process.env.RESEND_FROM ?? "MrNine <noreply@mrnine.net>",
  async sendVerificationRequest({ identifier, url }) {
    const subject = "MrNine — Đăng nhập 1 chạm";
    const text = [
      `Click vào link dưới để đăng nhập vào MrNine:`,
      ``,
      url,
      ``,
      `Link hết hạn sau 24 giờ. Nếu bạn không yêu cầu, bỏ qua email này.`,
      ``,
      `— MrNine`,
    ].join("\n");
    const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f5f7;padding:24px;color:#111">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
  <h1 style="margin:0 0 8px;font-size:20px">Đăng nhập MrNine</h1>
  <p style="margin:0 0 24px;color:#6b7280">Click nút bên dưới để đăng nhập. Link hết hạn sau 24 giờ.</p>
  <a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Đăng nhập</a>
  <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Hoặc copy paste link: ${url}</p>
</div>
<p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">MrNine · ${APP_URL}</p>
</body></html>`;
    const r = await sendMail({ to: identifier, subject, html, text });
    if (!r.ok) {
      throw new Error(`magic-link send failed: ${r.error ?? "unknown"}`);
    }
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: clientPromise ? MongoDBAdapter(clientPromise) : undefined,
  providers: [
    Google,
    Discord,
    ...(hasResend && hasMongo ? [magicLinkProvider] : []),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
        totp: { label: "TOTP code", type: "text" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        const totpInput = String(creds?.totp ?? "").trim();
        if (!email || !password) return null;

        const row = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
        if (!row || !row.passwordHash || row.status !== "active") return null;

        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;

        if (row.totpEnabled) {
          if (!totpInput) {
            // Hint client biết cần TOTP code.
            throw new Error("totp_required");
          }
          const { verifyToken } = await import("@/lib/totp");
          const okTotp = row.totpSecret ? verifyToken(totpInput, row.totpSecret) : false;
          if (!okTotp) return null;
        }

        return {
          id: row.id,
          email: row.email,
          name: row.displayName ?? undefined,
        };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/verify",
  },
  // Credentials provider yêu cầu JWT strategy.
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = String(token.uid);
      }

      // Backfill discordId for OAuth flows (best-effort).
      if (session.user && hasMongo && session.user.id) {
        try {
          const client = await Promise.race([
            clientPromise!,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("mongo-timeout")), 1500)),
          ]);
          const account = await Promise.race([
            client.db().collection("accounts").findOne({ userId: session.user.id, provider: "discord" }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);
          if (account?.providerAccountId) {
            session.user.discordId = String(account.providerAccountId);
          }
        } catch {
          // ignore
        }
      }

      return session;
    },
  },
});
