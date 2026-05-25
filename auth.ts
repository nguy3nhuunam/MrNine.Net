import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

const hasMongo = Boolean(clientPromise);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: clientPromise ? MongoDBAdapter(clientPromise) : undefined,
  providers: [Google, Discord],
  pages: {
    signIn: "/",
  },
  session: {
    strategy: hasMongo ? "database" : "jwt",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        if (clientPromise) {
          try {
            const client = await clientPromise;
            const account = await client
              .db()
              .collection("accounts")
              .findOne({ userId: user.id, provider: "discord" });
            if (account?.providerAccountId) {
              session.user.discordId = String(account.providerAccountId);
            }
          } catch {
            // ignore lookup failures; fall through with no discordId
          }
        }
      }

      return session;
    },
  },
});
