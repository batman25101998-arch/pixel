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

function requireOAuthEnv(provider: string, values: Record<string, string | undefined>) {
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(
      `${provider} login is not configured. Missing environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. ` +
        "For local development set NEXTAUTH_URL=http://localhost:3000."
    );
  }
}

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

type RawUser = {
  id: string;
  email: string;
  email_verified: Date | null;
  display_name: string;
  avatar_url: string | null;
};

function toAdapterUserFromRaw(user: RawUser) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.email_verified,
    name: user.display_name,
    image: user.avatar_url
  } satisfies AdapterUser;
}

async function ensureAccountsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      type VARCHAR(32) NOT NULL,
      provider VARCHAR(64) NOT NULL,
      provider_account_id VARCHAR(191) NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_provider_account_id_key
    ON accounts(provider, provider_account_id)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id)
  `);
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
  const base = PrismaAdapter(prisma) as Adapter;

  return {
    ...base,
    async createUser(data) {
      if (!data.email) {
        throw new Error("OAuth provider did not return an email address.");
      }

      const email = data.email.toLowerCase();
      const user = await prisma.user.create({
        data: {
          email,
          username: await uniqueUsername(email),
          displayName: (data.name?.trim() || email.split("@")[0]).slice(0, 48),
          avatarUrl: data.image,
          emailVerified: data.emailVerified,
          role: isAdminEmail(email) ? "ADMIN" : "USER"
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
      await ensureAccountsTable();
      const users = await prisma.$queryRaw<RawUser[]>`
        SELECT users.id, users.email, users.email_verified, users.display_name, users.avatar_url
        FROM accounts
        INNER JOIN users ON users.id = accounts.user_id
        WHERE accounts.provider = ${providerAccountId.provider}
          AND accounts.provider_account_id = ${providerAccountId.providerAccountId}
        LIMIT 1
      `;
      return users[0] ? toAdapterUserFromRaw(users[0]) : null;
    },
    async linkAccount(account) {
      await ensureAccountsTable();
      await prisma.$executeRaw`
        INSERT INTO accounts (
          user_id,
          type,
          provider,
          provider_account_id,
          refresh_token,
          access_token,
          expires_at,
          token_type,
          scope,
          id_token,
          session_state
        )
        VALUES (
          ${account.userId}::uuid,
          ${account.type},
          ${account.provider},
          ${account.providerAccountId},
          ${account.refresh_token ?? null},
          ${account.access_token ?? null},
          ${account.expires_at ?? null},
          ${account.token_type ?? null},
          ${account.scope ?? null},
          ${account.id_token ?? null},
          ${account.session_state ?? null}
        )
        ON CONFLICT (provider, provider_account_id) DO UPDATE SET
          refresh_token = EXCLUDED.refresh_token,
          access_token = EXCLUDED.access_token,
          expires_at = EXCLUDED.expires_at,
          token_type = EXCLUDED.token_type,
          scope = EXCLUDED.scope,
          id_token = EXCLUDED.id_token,
          session_state = EXCLUDED.session_state
      `;
      return account;
    },
    async unlinkAccount(providerAccountId) {
      await ensureAccountsTable();
      await prisma.$executeRaw`
        DELETE FROM accounts
        WHERE provider = ${providerAccountId.provider}
          AND provider_account_id = ${providerAccountId.providerAccountId}
      `;
    },
    async updateUser(data) {
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data.email?.toLowerCase(),
          displayName: data.name ?? undefined,
          avatarUrl: data.image ?? undefined,
          emailVerified: data.emailVerified
        }
      });
      return toAdapterUser(user);
    }
  };
}

const oauthProviders = [
  Google({
    clientId: env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? ""
  }),
  env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
    ? Apple({
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: env.APPLE_CLIENT_SECRET
      })
    : null
].filter((provider) => provider !== null);

if (!isDemoMode) {
  requireOAuthEnv("Google", {
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    AUTH_SECRET: env.AUTH_SECRET,
    NEXTAUTH_URL: env.NEXTAUTH_URL
  });
}

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
      if (isDemoMode) return true;
      if (!user.id) return true;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)) {
        return true;
      }
      const account = await prisma.user.findUnique({ where: { id: user.id }, select: { bannedAt: true } });
      return !account?.bannedAt;
    },
    async jwt({ token, user }) {
      if (isDemoMode) {
        token.sub = DEMO_USER.id;
        token.name = DEMO_USER.name;
        token.email = DEMO_USER.email;
        token.role = "USER";
        token.banned = false;
        token.founderNumber = DEMO_USER.founderNumber;
        token.kingdomUnlocked = false;
        return token;
      }
      if (user?.id) {
        token.sub = user.id;
      }
      if (token.sub) {
        try {
          const account = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, bannedAt: true, founderNumber: true, kingdomUnlockedAt: true }
          });
          token.role = account?.role === "ADMIN" ? "ADMIN" : "USER";
          token.banned = Boolean(account?.bannedAt);
          token.founderNumber = account?.founderNumber ?? null;
          token.kingdomUnlocked = Boolean(account?.kingdomUnlockedAt);
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
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
        session.user.banned = Boolean(token.banned);
        session.user.founderNumber = typeof token.founderNumber === "number" ? token.founderNumber : null;
        session.user.kingdomUnlocked = Boolean(token.kingdomUnlocked);
      }
      return session;
    }
  }
});

const demoSession = {
  user: {
    id: DEMO_USER.id,
    name: DEMO_USER.name,
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
