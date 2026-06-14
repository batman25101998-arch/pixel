import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const owners = await prisma.user.findMany({
    take: 25,
    orderBy: { ownedHexes: { _count: "desc" } },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      _count: { select: { ownedHexes: true, territories: true } }
    }
  });

  return NextResponse.json({
    owners: owners.map((owner) => ({
      id: owner.id,
      name: owner.displayName,
      image: owner.avatarUrl,
      hexes: owner._count.ownedHexes,
      territories: owner._count.territories
    }))
  });
}
