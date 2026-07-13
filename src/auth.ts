import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { Prisma } from "@prisma/client";
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

export const googleAuthConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

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

function fallbackNameForEmail(email: string) {
  return email.split("@")[0].trim().slice(0, 48) || "Earth Owner";
}

function authAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async createUser(data) {
      const email = data.email.toLowerCase();
      console.info("[auth] createUser start", {
        email,
        role: isAdminEmail(email) ? "ADMIN" : "USER",
        hasName: Boolean(data.name?.trim()),
        hasImage: Boolean(data.image)
      });
      try {
        const user = await prisma.user.create({
          data: {
            email,
            username: await uniqueUsername(email),
            displayName: data.name?.trim().slice(0, 48) || fallbackNameForEmail(email),
            avatarUrl: data.image || null,
            emailVerified: data.emailVerified,
            role: isAdminEmail(email) ? "ADMIN" : "USER",
            lastLoginAt: new Date()
          }
        });
        console.info("[auth] createUser success", { email: user.email, userId: user.id, role: user.role });
        return toAdapterUser(user);
      } catch (error) {
        console.error("[auth] createUser failed", {
          email,
          role: isAdminEmail(email) ? "ADMIN" : "USER",
          error
        });
        throw error;
      }
    },
    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
      const normalizedEmail = email.toLowerCase();
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      console.info("[auth] User lookup by email", {
        email: normalizedEmail,
        found: Boolean(user)
      });
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
      console.info("[auth] User lookup by OAuth account", {
        provider: providerAccountId.provider,
        found: Boolean(account?.user),
        email: account?.user.email ?? null
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

const oauthProviders = googleAuthConfigured
  ? [
      Google({
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        allowDangerousEmailAccountLinking: true,
        profile(profile) {
          const googleProfile = profile as Prisma.JsonObject & {
            sub?: unknown;
            name?: unknown;
            email?: unknown;
            picture?: unknown;
            email_verified?: unknown;
          };
          const email = typeof googleProfile.email === "string" ? googleProfile.email.toLowerCase() : "";
          console.info("[auth] google profile email", {
            email: email || null,
            emailVerified: Boolean(googleProfile.email_verified),
            hasName: typeof googleProfile.name === "string" && googleProfile.name.trim().length > 0,
            hasPicture: typeof googleProfile.picture === "string" && googleProfile.picture.length > 0
          });
          return {
            id: typeof googleProfile.sub === "string" ? googleProfile.sub : email,
            name: typeof googleProfile.name === "string" ? googleProfile.name : fallbackNameForEmail(email),
            email,
            image: typeof googleProfile.picture === "string" ? googleProfile.picture : null,
            emailVerified: googleProfile.email_verified ? new Date() : null
          };
        }
      })
    ]
  : [];

const nextAuth = NextAuth({
  adapter: isDemoMode ? undefined : authAdapter(),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? env.AUTH_SECRET,
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
    async signIn({ user, account, profile }) {
      if (isDemoMode) return true;
      const email =
        typeof user.email === "string"
          ? user.email.toLowerCase()
          : typeof profile?.email === "string"
            ? profile.email.toLowerCase()
            : null;

      console.info("[auth] signIn callback", {
        provider: account?.provider ?? "credentials",
        email,
        userId: user.id ?? null
      });

      try {
        const existingUser = email
          ? await prisma.user.findUnique({
              where: { email },
              select: { id: true, email: true, bannedAt: true }
            })
          : null;

        if (!existingUser) {
          console.info("[auth] signIn allowed", {
            provider: account?.provider ?? "credentials",
            email,
            reason: "new-user-or-adapter-create"
          });
          return true;
        }

        if (existingUser.bannedAt) {
          console.warn("[auth] signIn rejected", {
            email: existingUser.email,
            userId: existingUser.id,
            reason: "banned",
            bannedAt: existingUser.bannedAt.toISOString()
          });
          return false;
        }

        console.info("[auth] signIn allowed", {
          email: existingUser.email,
          userId: existingUser.id,
          reason: "existing-user-not-banned"
        });
        return true;
      } catch (error) {
        console.error("[auth] signIn callback lookup failed; allowing non-banned OAuth flow to continue", {
          provider: account?.provider ?? "credentials",
          email,
          error
        });
        return true;
      }
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
      if (token.sub) {
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
      if (isDemoMode || !user.id) return;

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
