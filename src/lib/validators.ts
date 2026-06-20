import { z } from "zod";

export const hexPatchSchema = z.object({
  title: z.string().trim().max(80).optional(),
  message: z.string().max(240).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  externalLink: z.string().url().nullable().optional(),
  status: z.enum(["OWNED", "FOR_SALE", "LOCKED", "BANNED"]).optional(),
  priceCents: z.number().int().min(100).max(100000000).optional()
});

export const checkoutSchema = z.object({
  h3Index: z.string().min(1),
  title: z.string().trim().max(80).default(""),
  message: z.string().max(240).default(""),
  avatarUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  externalLink: z.string().url().optional()
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
