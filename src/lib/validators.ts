import { z } from "zod";

export const hexPatchSchema = z.object({
  message: z.string().max(240).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  status: z.enum(["OWNED", "FOR_SALE", "LOCKED", "BANNED"]).optional(),
  priceCents: z.number().int().min(100).max(100000000).optional()
});

export const checkoutSchema = z.object({
  h3Index: z.string().min(1),
  message: z.string().max(240).default(""),
  avatarUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional()
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
  description: z.string().trim().max(240).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hexIds: z.array(z.string().min(1)).min(2).max(1000)
});
