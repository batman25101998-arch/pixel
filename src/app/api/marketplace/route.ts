import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toFeature } from "@/lib/hex";
import { demoListings } from "@/lib/demo";
import { isDemoMode } from "@/lib/env";

export async function GET() {
  if (isDemoMode) return NextResponse.json({ listings: demoListings });
  const hexes = await prisma.hex.findMany({
    where: { status: "FOR_SALE" },
    take: 100,
    orderBy: { priceCents: "asc" },
    include: { owner: { select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
  });

  return NextResponse.json({ listings: hexes.map(toFeature) });
}
