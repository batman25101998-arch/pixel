import { z } from "zod";

function normalizeOptionalWebUrl(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const optionalWebUrl = z.preprocess(
  normalizeOptionalWebUrl,
  z.string().url().max(2048).nullable().optional()
);

export const hexPatchSchema = z.object({
  title: z.string().trim().max(80).optional(),
  message: z.string().max(240).optional(),
  externalLink: optionalWebUrl
});

export const checkoutSchema = z.object({
  h3Index: z.string().min(1),
  title: z.string().trim().max(80).default(""),
  message: z.string().max(240).default(""),
  uploadedImageUrl: z.string().url().refine((value) => {
    try {
      return new URL(value).hostname.endsWith(".blob.vercel-storage.com");
    } catch {
      return false;
    }
  }, "Uploaded image must come from Vercel Blob.").optional(),
  externalLink: optionalWebUrl
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(180).optional(),
  avatarUrl: z.string().url().optional()
});

export const uploadSchema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"])
});

export const territorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  flag: z.string().trim().min(1).max(16),
  description: z.string().trim().max(240).default(""),
  bannerImageUrl: z.string().url().nullable().optional(),
  flagImageUrl: z.string().url().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hexIds: z.array(z.string().min(1)).min(10).max(5000)
});

export const hexOfferSchema = z.object({
  targetHexId: z.string().uuid(),
  amountCents: z.number().int().min(100).max(100_000_000),
  message: z.string().trim().max(240).default("")
});

export const offerActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("counter"), amountCents: z.number().int().min(100).max(100_000_000) })
]);

export const tradeOfferSchema = z.object({
  offeredHexIds: z.array(z.string().uuid()).min(1).max(50),
  requestedHexIds: z.array(z.string().uuid()).min(1).max(50),
  extraAmountCents: z.number().int().min(0).max(100_000_000).default(0),
  message: z.string().trim().max(240).default("")
});

export const tradeActionSchema = z.object({
  action: z.enum(["accept", "reject", "cancel"])
});

export const adminUserSchema = z.object({
  banned: z.boolean(),
  reason: z.string().trim().max(240).default("")
});

export const adminImageSchema = z.discriminatedUnion("targetType", [
  z.object({ targetType: z.literal("user"), targetId: z.string().uuid(), field: z.literal("avatarUrl") }),
  z.object({
    targetType: z.literal("hex"),
    targetId: z.string().uuid(),
    field: z.enum(["avatarUrl", "imageUrl"])
  })
]);

export const adminOwnershipSchema = z.object({
  hexIdentifier: z.string().trim().min(1).max(64),
  ownerIdentifier: z.string().trim().min(1).max(191),
  reason: z.string().trim().min(3).max(240)
});
