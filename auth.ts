import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import clientPromise from "@/lib/mongodb";
import { db } from "@/lib/pg/db";
import { users } from "@/lib/pg/schema";

const hasMongo = Boolean(clientPromise);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: clientPromise ? MongoDBAdapter(clientPromise) : undefined,
  providers: [
    Google,
    Discord,
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const row = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
        if (!row || !row.passwordHash || row.status !== "active") return null;

        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;

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
