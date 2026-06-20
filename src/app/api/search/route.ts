import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cellForLngLat, toFeature } from "@/lib/hex";
import { isDemoMode } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const lng = Number(url.searchParams.get("lng"));
  const lat = Number(url.searchParams.get("lat"));

  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    const h3Index = cellForLngLat(lng, lat);
    if (isDemoMode) return NextResponse.json({ h3Index, results: [] });
    const hex = await prisma.hex.findUnique({
      where: { h3Index },
      include: { owner: { select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
    });
    return NextResponse.json({ h3Index, results: hex ? [toFeature(hex)] : [] });
  }

  if (!query) return NextResponse.json({ results: [] });
  if (isDemoMode) return NextResponse.json({ results: [] });

  const hexes = await prisma.hex.findMany({
    where: {
      OR: [
        { h3Index: { equals: query } },
        { owner: { displayName: { contains: query, mode: "insensitive" } } },
        { owner: { username: { contains: query, mode: "insensitive" } } }
      ]
    },
    take: 25,
    include: { owner: { select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
  });

  return NextResponse.json({ results: hexes.map(toFeature) });
}
