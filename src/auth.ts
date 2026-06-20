import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEMO_USER } from "@/lib/demo";
import { env, isAdminEmail, isDemoMode } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const googleAuthConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const appleAuthConfigured = Boolean(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET);

function toAdapterUser(user: {
  id: string;
  email: string;
  emailVerified: Date | null;
  displayName: string;
  avatarUrl: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.displayName,
    image: user.avatarUrl
  } satisfies AdapterUser;
}

async function uniqueUsername(email: string) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "player";

  let candidate = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}_${suffix}`.slice(0, 40);
  }
  return candidate;
}

function authAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async createUser(data) {
      if (!data.email) {
        throw new Error("Google did not return an email address.");
      }

      const email = data.email.toLowerCase();
      const user = await prisma.user.create({
        data: {
          email,
          username: await uniqueUsername(email),
          displayName: (data.name?.trim() || email.split("@")[0]).slice(0, 48),
          avatarUrl: data.image,
          emailVerified: data.emailVerified,
          role: isAdminEmail(email) ? "ADMIN" : "USER",
          lastLoginAt: new Date()
        }
      });
      return toAdapterUser(user);
    },
    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByAccount(providerAccountId) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: providerAccountId.provider,
            providerAccountId: providerAccountId.providerAccountId
          }
        },
        include: { user: true }
      });
      return account ? toAdapterUser(account.user) : null;
    },
    async updateUser(data) {
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data.email?.toLowerCase(),
          displayName: data.name?.trim() || undefined,
          avatarUrl: data.image,
          emailVerified: data.emailVerified
        }
      });
      return toAdapterUser(user);
    },
    async deleteUser(id) {
      return toAdapterUser(await prisma.user.delete({ where: { id } }));
    }
  };
}

const oauthProviders = [
  googleAuthConfigured
    ? Google({
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!
      })
    : null,
  appleAuthConfigured
    ? Apple({
        clientId: env.APPLE_CLIENT_ID!,
        clientSecret: env.APPLE_CLIENT_SECRET!
      })
    : null
].filter((provider) => provider !== null);

const nextAuth = NextAuth({
  adapter: isDemoMode ? undefined : authAdapter(),
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    ...(isDemoMode ? [] : oauthProviders),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(rawCredentials) {
        if (isDemoMode) {
          return { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name };
        }

        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() }
        });
        if (!user?.passwordHash || user.bannedAt) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          image: user.avatarUrl
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      if (isDemoMode || !user.id || !uuidPattern.test(user.id)) return true;
      const account = await prisma.user.findUnique({
        where: { id: user.id },
        select: { bannedAt: true }
      });
      return !account?.bannedAt;
    },
    async jwt({ token, user }) {
      if (isDemoMode) {
        token.sub = DEMO_USER.id;
        token.name = DEMO_USER.name;
        token.username = DEMO_USER.name;
        token.email = DEMO_USER.email;
        token.role = "USER";
        token.banned = false;
        token.founderNumber = DEMO_USER.founderNumber;
        token.kingdomUnlocked = false;
        return token;
      }

      if (user?.id) token.sub = user.id;
      if (token.sub && uuidPattern.test(token.sub)) {
        try {
          const account = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              email: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
              bannedAt: true,
              founderNumber: true,
              kingdomUnlockedAt: true
            }
          });
          if (account) {
            token.email = account.email;
            token.name = account.displayName;
            token.username = account.username;
            token.picture = account.avatarUrl;
            token.role = account.role === "ADMIN" ? "ADMIN" : "USER";
            token.banned = Boolean(account.bannedAt);
            token.founderNumber = account.founderNumber;
            token.kingdomUnlocked = Boolean(account.kingdomUnlockedAt);
          }
        } catch (error) {
          console.error("Unable to refresh account access state", error);
          token.role ??= token.email && isAdminEmail(token.email) ? "ADMIN" : "USER";
          token.banned ??= false;
          token.founderNumber ??= null;
          token.kingdomUnlocked ??= false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.banned ? "" : token.sub ?? "";
        session.user.name = token.name;
        session.user.username = typeof token.username === "string" ? token.username : null;
        session.user.email = token.email ?? "";
        session.user.image = token.picture ?? null;
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
        session.user.banned = Boolean(token.banned);
        session.user.founderNumber = typeof token.founderNumber === "number" ? token.founderNumber : null;
        session.user.kingdomUnlocked = Boolean(token.kingdomUnlocked);
      }
      return session;
    }
  },
  events: {
    async signIn({ user, account, profile }) {
      if (isDemoMode || !user.id || !uuidPattern.test(user.id)) return;

      const profileName = typeof profile?.name === "string" ? profile.name.trim() : "";
      const profileImage =
        account?.provider === "google" && typeof profile?.picture === "string"
          ? profile.picture
          : user.image;

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            displayName: profileName.slice(0, 48) || user.name?.trim().slice(0, 48) || undefined,
            avatarUrl: profileImage || undefined,
            lastLoginAt: new Date()
          }
        });
      } catch (error) {
        console.error("Could not update the OAuth user profile", error);
      }
    }
  }
});

const demoSession = {
  user: {
    id: DEMO_USER.id,
    name: DEMO_USER.name,
    username: DEMO_USER.name,
    email: DEMO_USER.email,
    image: null,
    role: "USER" as const,
    banned: false,
    founderNumber: DEMO_USER.founderNumber,
    kingdomUnlocked: false
  },
  expires: "2999-12-31T23:59:59.999Z"
};

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth = (isDemoMode ? async () => demoSession : nextAuth.auth) as typeof nextAuth.auth;
