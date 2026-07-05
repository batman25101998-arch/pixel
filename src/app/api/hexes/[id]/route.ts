import { NextResponse } from "next/server";
import { isValidCell } from "h3-js";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/env";
import { hexPatchSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isDemoMode) {
    return NextResponse.json({ hex: null });
  }

  const session = await auth();
  const hex = await prisma.hex.findUnique({
    where: isValidCell(id) ? { h3Index: id } : { id },
    include: {
      owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } },
    }
  });
  if (!hex) return NextResponse.json({ hex: null });

  return NextResponse.json({
    hex: {
      id: hex.id,
      h3Index: hex.h3Index,
      latitude: hex.latitude,
      longitude: hex.longitude,
      ownerId: hex.ownerId,
      ownerName: hex.owner.displayName,
      ownerUsername: hex.owner.username,
      ownerImage: hex.avatarUrl ?? hex.owner.avatarUrl,
      ownerFounderNumber: hex.owner.founderNumber,
      ownerKingdomUnlocked: Boolean(hex.owner.kingdomUnlockedAt),
      title: hex.title,
      message: hex.message,
      imageUrl: hex.imageUrl,
      avatarUrl: hex.avatarUrl,
      externalLink: hex.link,
      status: hex.ownerId === session?.user?.id ? "MY_OWNED" : "OWNED",
      priceCents: Number(hex.priceCents),
      purchaseDate: hex.purchaseDate.toISOString(),
      listingId: null
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    console.info("[hex-details] Update requested", {
      identifier: id,
      userId: session.user.id,
      fields: body && typeof body === "object" ? Object.keys(body) : [],
      externalLink: body && typeof body === "object" && "externalLink" in body ? body.externalLink : undefined
    });

    const parsed = hexPatchSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.flatten();
      console.warn("[hex-details] Validation failed", { identifier: id, details });
      return NextResponse.json({
        error: "Hex details are invalid.",
        details,
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      }, { status: 400 });
    }

    const hex = await prisma.hex.findUnique({
      where: isValidCell(id) ? { h3Index: id } : { id },
      select: { id: true, h3Index: true, ownerId: true }
    });
    if (!hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
    if (hex.ownerId !== session.user.id) {
      console.warn("[hex-details] Ownership check failed", { hexId: hex.id, ownerId: hex.ownerId, userId: session.user.id });
      return NextResponse.json({ error: "Only the hex owner can edit these details." }, { status: 403 });
    }

    const updated = await prisma.hex.update({
      where: { id: hex.id },
      data: {
        title: parsed.data.title,
        message: parsed.data.message,
        link: parsed.data.externalLink
      },
      include: { owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
    });
    console.info("[hex-details] Update saved", {
      hexId: updated.id,
      h3Index: updated.h3Index,
      imageUrl: updated.imageUrl,
      link: updated.link
    });

    return NextResponse.json({
      hex: {
        ...updated,
        priceCents: Number(updated.priceCents),
        purchaseDate: updated.purchaseDate.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        externalLink: updated.link
      }
    });
  } catch (error) {
    console.error("[hex-details] Update failed", { identifier: id, userId: session.user.id, error });
    const details = error instanceof Error ? error.message : "Unknown database error.";
    return NextResponse.json({ error: "Hex details could not be saved.", details }, { status: 500 });
  }
}
