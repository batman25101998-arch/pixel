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
  const parsed = hexPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const hex = await prisma.hex.findUnique({ where: { id }, select: { ownerId: true, status: true } });
  if (!hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
  if (hex.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const { externalLink, ...hexData } = parsed.data;
    const saved = await tx.hex.update({
      where: { id },
      data: { ...hexData, link: externalLink },
      include: { owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
    });

    return saved;
  });

  return NextResponse.json({
    hex: {
      ...updated,
      priceCents: Number(updated.priceCents),
      purchaseDate: updated.purchaseDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    }
  });
}
