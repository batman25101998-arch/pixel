import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-100) || "hex-image";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const formData = await request.formData();
    const hexId = formData.get("hexId");
    const file = formData.get("file");

    if (typeof hexId !== "string" || !hexId) {
      return NextResponse.json({ error: "Hex ID is required." }, { status: 400 });
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

    const hex = await prisma.hex.findUnique({
      where: { id: hexId },
      select: { id: true, h3Index: true, ownerId: true }
    });
    if (!hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
    if (hex.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Only the hex owner can change its image." }, { status: 403 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("[hex-image-upload] BLOB_READ_WRITE_TOKEN is not configured.");
      return NextResponse.json({ error: "Image uploads are temporarily unavailable." }, { status: 503 });
    }

    const pathname = `hexes/${hex.h3Index}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const uploadResponse = await fetch(`https://blob.vercel-storage.com/?pathname=${encodeURIComponent(pathname)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "x-api-version": "12",
        "x-content-length": String(file.size),
        "x-content-type": file.type,
        "x-vercel-blob-access": "public"
      },
      body: file
    });

    if (!uploadResponse.ok) {
      console.error("[hex-image-upload] Vercel Blob rejected upload", uploadResponse.status, await uploadResponse.text());
      return NextResponse.json({ error: "Image could not be uploaded." }, { status: 502 });
    }

    const blob = (await uploadResponse.json()) as { url?: string };
    if (!blob.url) {
      console.error("[hex-image-upload] Vercel Blob returned no public URL.");
      return NextResponse.json({ error: "Image upload returned an invalid response." }, { status: 502 });
    }

    await prisma.hex.update({ where: { id: hex.id }, data: { imageUrl: blob.url } });
    return NextResponse.json({ imageUrl: blob.url });
  } catch (error) {
    console.error("[hex-image-upload] Upload failed", error);
    return NextResponse.json({ error: "Image upload failed." }, { status: 500 });
  }
}
