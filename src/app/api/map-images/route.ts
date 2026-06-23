import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/env";

const CLOSE_IMAGE_LIMIT = 300;

function parseBbox(value: string | null) {
  if (!value) return null;
  const values = value.split(",").map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) return null;
  const [west, south, east, north] = values;
  if (west < -180 || west > 180 || east < -180 || east > 180 || south < -90 || north > 90 || south >= north) return null;
  return { west, south, east, north };
}

export async function GET(request: Request) {
  if (isDemoMode) return NextResponse.json({ type: "FeatureCollection", features: [] });

  const searchParams = new URL(request.url).searchParams;
  const bbox = parseBbox(searchParams.get("bbox"));
  if (!bbox) return NextResponse.json({ error: "A valid bbox is required." }, { status: 400 });
  const longitudeFilter = bbox.west <= bbox.east
    ? { longitude: { gte: bbox.west, lte: bbox.east } }
    : { OR: [{ longitude: { gte: bbox.west } }, { longitude: { lte: bbox.east } }] };

  try {
    const hexes = await prisma.hex.findMany({
      where: {
        latitude: { gte: bbox.south, lte: bbox.north },
        status: { in: ["OWNED", "FOR_SALE"] },
        AND: [
          longitudeFilter,
          { imageUrl: { not: null } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: CLOSE_IMAGE_LIMIT,
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            founderNumber: true,
            kingdomUnlockedAt: true
          }
        }
      }
    });

    return NextResponse.json({
      type: "FeatureCollection",
      features: hexes.flatMap((hex) => {
        if (hex.latitude === null || hex.longitude === null) return [];
        return [{
          type: "Feature" as const,
          id: hex.h3Index,
          geometry: { type: "Point" as const, coordinates: [hex.longitude, hex.latitude] },
          properties: {
            id: hex.id,
            h3Index: hex.h3Index,
            latitude: hex.latitude,
            longitude: hex.longitude,
            ownerId: hex.ownerId,
            ownerName: hex.owner.displayName,
            ownerImage: hex.avatarUrl ?? hex.owner.avatarUrl,
            ownerFounderNumber: hex.owner.founderNumber,
            ownerKingdomUnlocked: Boolean(hex.owner.kingdomUnlockedAt),
            title: hex.title,
            message: hex.message,
            imageUrl: hex.imageUrl,
            externalLink: hex.link,
            status: hex.status,
            priceCents: Number(hex.priceCents)
          }
        }];
      })
    }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("Map images could not be loaded", error);
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
