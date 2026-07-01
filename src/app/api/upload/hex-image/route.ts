import { NextResponse } from "next/server";
import { getResolution, isValidCell } from "h3-js";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { getBlobTokenStatus } from "@/lib/blob";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const runtime = "nodejs";

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-100) || "hex-image";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const formData = await request.formData();
    const hexId = formData.get("hexId");
    const h3Index = formData.get("h3Index");
    const file = formData.get("file");

    if ((typeof hexId !== "string" || !hexId) && (typeof h3Index !== "string" || !h3Index)) {
      return NextResponse.json({ error: "Hex ID or H3 index is required." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Select an image to upload." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image must be smaller than 5MB." }, { status: 413 });
    }

    const hex = typeof hexId === "string" && hexId
      ? await prisma.hex.findUnique({ where: { id: hexId }, select: { id: true, h3Index: true, ownerId: true } })
      : null;
    if (typeof hexId === "string" && hexId && !hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
    if (hex && hex.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Only the hex owner can change its image." }, { status: 403 });
    }

    const purchaseH3Index = typeof h3Index === "string" ? h3Index : null;
    if (!hex && purchaseH3Index) {
      if (!isValidCell(purchaseH3Index) || getResolution(purchaseH3Index) !== 5) {
        return NextResponse.json({ error: "A valid resolution-5 H3 index is required." }, { status: 400 });
      }
      const existingHex = await prisma.hex.findUnique({ where: { h3Index: purchaseH3Index }, select: { id: true } });
      if (existingHex) return NextResponse.json({ error: "This hex is already owned." }, { status: 409 });
    }

    const tokenStatus = getBlobTokenStatus();
    const token = tokenStatus.token;
    const runtimeEnvironment = process.env.VERCEL === "1"
      ? `production (${process.env.VERCEL_ENV ?? "vercel"})`
      : "local development";
    console.info(`[hex-image-upload] BLOB_READ_WRITE_TOKEN prefix = ${tokenStatus.prefix}`);
    console.info(`[hex-image-upload] runtime = ${runtimeEnvironment}`);
    if (!token) {
      console.error(`[hex-image-upload] Blob token is ${tokenStatus.reason}.`);
      return NextResponse.json(
        {
          error: tokenStatus.reason === "placeholder"
            ? "Image uploads are unavailable because BLOB_READ_WRITE_TOKEN is still a placeholder. Add the real store token to .env.local and restart Next.js."
            : "Image uploads are unavailable because BLOB_READ_WRITE_TOKEN is missing from .env.local."
        },
        { status: 503 }
      );
    }

    const targetH3Index = hex?.h3Index ?? purchaseH3Index!;
    const pathname = `hexes/${targetH3Index}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    console.info("[hex-image-upload] Calling Vercel Blob put()", {
      pathname,
      contentType: file.type,
      size: file.size
    });
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      maximumSizeInBytes: MAX_IMAGE_SIZE,
      token
    });
    console.info("[hex-image-upload] Vercel Blob response", blob);

    console.info("[hex-image-upload] blob URL", blob.url);
    if (hex) {
      const updatedHex = await prisma.hex.update({ where: { id: hex.id }, data: { imageUrl: blob.url } });
      console.info("[hex-image-upload] Hex update result", { id: updatedHex.id, h3Index: updatedHex.h3Index, imageUrl: updatedHex.imageUrl });
    }
    return NextResponse.json({ imageUrl: blob.url });
  } catch (error) {
    console.error("[hex-image-upload] Vercel Blob upload failed", error);
    const message = error instanceof Error ? error.message : "Unknown Vercel Blob error.";
    return NextResponse.json({ error: `Image upload failed: ${message}` }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const hexId = new URL(request.url).searchParams.get("hexId");
    if (!hexId) return NextResponse.json({ error: "Hex ID is required." }, { status: 400 });
    const hex = await prisma.hex.findUnique({ where: { id: hexId }, select: { id: true, ownerId: true } });
    if (!hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
    if (hex.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Only the hex owner can remove its image." }, { status: 403 });
    }
    await prisma.hex.update({ where: { id: hex.id }, data: { imageUrl: null } });
    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    console.error("[hex-image-upload] Remove failed", error);
    return NextResponse.json({ error: "Image could not be removed." }, { status: 500 });
  }
}
