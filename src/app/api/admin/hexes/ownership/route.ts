import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { territoryStatistics } from "@/lib/territory";
import { adminOwnershipSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const parsed = adminOwnershipSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { hexIdentifier, ownerIdentifier, reason } = parsed.data;
  const isHexUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hexIdentifier);
  const isOwnerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerIdentifier);
  const [hex, owner] = await Promise.all([
    prisma.hex.findFirst({
      where: { OR: [...(isHexUuid ? [{ id: hexIdentifier }] : []), { h3Index: hexIdentifier }] },
      select: { id: true, h3Index: true, ownerId: true, territoryId: true }
    }),
    prisma.user.findFirst({
      where: {
        OR: [
          ...(isOwnerUuid ? [{ id: ownerIdentifier }] : []),
          { email: ownerIdentifier },
          { username: ownerIdentifier }
        ]
      },
      select: { id: true, displayName: true, bannedAt: true, founderNumber: true }
    })
  ]);

  if (!hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
  if (!owner) return NextResponse.json({ error: "New owner not found." }, { status: 404 });
  if (owner.bannedAt) return NextResponse.json({ error: "Ownership cannot be assigned to a banned user." }, { status: 409 });
  if (owner.id === hex.ownerId) return NextResponse.json({ error: "That user already owns this hex." }, { status: 409 });

  await prisma.$transaction(async (transaction) => {
    await transaction.marketplace.updateMany({
      where: { hexId: hex.id, status: "ACTIVE" },
      data: { status: "CANCELED" }
    });
    await transaction.hex.update({
      where: { id: hex.id },
      data: { ownerId: owner.id, territoryId: null, status: "OWNED", purchaseDate: new Date() }
    });
    const newOwnerHexCount = await transaction.hex.count({ where: { ownerId: owner.id } });
    if (newOwnerHexCount >= 1000) {
      await transaction.user.updateMany({
        where: { id: owner.id, kingdomUnlockedAt: null },
        data: { kingdomUnlockedAt: new Date() }
      });
    }
    if (hex.territoryId) {
      const remainingHexes = await transaction.hex.findMany({
        where: { territoryId: hex.territoryId },
        select: { h3Index: true, priceCents: true }
      });
      const statistics = territoryStatistics(remainingHexes);
      await transaction.territory.update({
        where: { id: hex.territoryId },
        data: {
          hexCount: remainingHexes.length,
          statistics,
          status: remainingHexes.length < 2 ? "DISBANDED" : undefined
        }
      });
    }
    await transaction.transaction.create({
      data: {
        hexId: hex.id,
        buyerId: owner.id,
        sellerId: hex.ownerId,
        type: "ADMIN_ADJUSTMENT",
        status: "COMPLETED",
        amountCents: 0,
        platformFeeCents: 0,
        metadata: { adminId: session.user.id, reason },
        completedAt: new Date()
      }
    });
    await transaction.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: "HEX_OWNERSHIP_CHANGED",
        targetType: "hex",
        targetId: hex.id,
        metadata: { h3Index: hex.h3Index, previousOwnerId: hex.ownerId, newOwnerId: owner.id, reason }
      }
    });
  });

  return NextResponse.json({
    transferred: true,
    owner: { id: owner.id, name: owner.displayName, founderNumber: owner.founderNumber }
  });
}
