import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  ADMIN_EMAILS: z.string().default(""),
  HEX_RESOLUTION: z.coerce.number().int().min(0).max(15).default(5),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional()
});

export const isDemoMode = process.env.DEMO_MODE === "true";

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const deploymentUrl = vercelHost ? `https://${vercelHost}` : "http://localhost:3000";

export const env = serverSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? (isDemoMode ? "postgresql://demo:demo@localhost:5432/demo" : undefined),
  AUTH_SECRET: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? (isDemoMode ? "demo-mode-secret-at-least-32-characters" : undefined),
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? deploymentUrl,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? deploymentUrl,
  NEXT_PUBLIC_MAP_STYLE_URL:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
    "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_missing",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_missing",
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  S3_REGION: process.env.S3_REGION ?? "us-east-1",
  S3_BUCKET: process.env.S3_BUCKET ?? "pixel-world",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL ?? "http://localhost:9000/pixel-world",
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",
  HEX_RESOLUTION: process.env.HEX_RESOLUTION ?? "5",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
});

export const isAdminEmail = (email?: string | null) =>
  Boolean(email && env.ADMIN_EMAILS.split(",").map((item) => item.trim().toLowerCase()).includes(email.toLowerCase()));
