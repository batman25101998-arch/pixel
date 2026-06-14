import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toFeature } from "@/lib/hex";

export async function GET() {
  const hexes = await prisma.hex.findMany({
    where: { status: "FOR_SALE" },
    take: 100,
    orderBy: { priceCents: "asc" },
    include: { owner: { select: { id: true, displayName: true, avatarUrl: true } } }
  });

  return NextResponse.json({ listings: hexes.map(toFeature) });
}
