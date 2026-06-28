import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/env";
import { cellToLatLng } from "h3-js";

function territoryLevel(hexCount: number) {
  if (hexCount >= 5000) return "EMPIRE" as const;
  if (hexCount >= 1000) return "KINGDOM" as const;
  if (hexCount >= 100) return "CITY" as const;
  return "VILLAGE" as const;
}
import {
  areContiguous,
  CUSTOM_TERRITORY_HEX_REQUIREMENT,
  slugifyTerritoryName,
  territoryGeometry,
  territoryStatistics
} from "@/lib/territory";
import { territorySchema } from "@/lib/validators";

export async function GET() {
  if (isDemoMode) {
    return NextResponse.json({ territories: [], geojson: { type: "FeatureCollection", features: [] } });
  }
  try {
    const territories = await prisma.territory.findMany({
      where: { status: "ACTIVE" },
      take: 100,
      orderBy: { hexes: { _count: "desc" } },
      include: {
        owner: { select: { displayName: true, founderNumber: true, kingdomUnlockedAt: true } },
        hexes: { select: { h3Index: true } },
        _count: { select: { hexes: true } }
      }
    });

    const geojson: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
      type: "FeatureCollection",
      features: territories
        .filter((territory) => territory.hexes.length > 0)
        .map((territory, rank) => {
          const centers = territory.hexes.map((hex) => cellToLatLng(hex.h3Index));
          const center = centers.reduce(
            (sum, [latitude, longitude]) => [sum[0] + latitude, sum[1] + longitude] as [number, number],
            [0, 0] as [number, number]
          );
          return {
            type: "Feature",
            id: territory.id,
            geometry: territoryGeometry(territory.hexes.map((hex) => hex.h3Index)),
            properties: {
              id: territory.id,
              name: territory.name,
              flag: territory.flag,
              color: territory.color,
              description: territory.description,
              bannerImageUrl: territory.bannerImageUrl,
              flagUrl: territory.flagUrl,
              ownerName: territory.owner.displayName,
              ownerFounderNumber: territory.owner.founderNumber,
              ownerKingdomUnlocked: Boolean(territory.owner.kingdomUnlockedAt),
              level: territory.level,
              hexCount: territory._count.hexes,
              statistics: territory.statistics,
              rank: rank + 1,
              centerLatitude: center[0] / centers.length,
              centerLongitude: center[1] / centers.length
            }
          };
        })
    };

    return NextResponse.json({ territories, geojson });
  } catch (error) {
    console.error("Territory load failed", error);
    return NextResponse.json({
      territories: [],
      geojson: { type: "FeatureCollection", features: [] }
    });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = territorySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const hexes = await prisma.hex.findMany({
    where: {
      id: { in: parsed.data.hexIds },
      ownerId: session.user.id,
      territoryId: null
    },
    select: { id: true, h3Index: true, priceCents: true }
  });

  if (hexes.length !== parsed.data.hexIds.length) {
    return NextResponse.json(
      { error: "Every selected hex must belong to you and not already be assigned to a territory." },
      { status: 400 }
    );
  }
  if (hexes.length < CUSTOM_TERRITORY_HEX_REQUIREMENT) {
    return NextResponse.json(
      { error: `Custom territories require ${CUSTOM_TERRITORY_HEX_REQUIREMENT} connected hexes.` },
      { status: 400 }
    );
  }
  if (!areContiguous(hexes.map((hex) => hex.h3Index))) {
    return NextResponse.json({ error: "Territories must be made from adjacent hexes." }, { status: 400 });
  }

  try {
    const statistics = territoryStatistics(hexes);
    const territory = await prisma.$transaction(async (transaction) => {
      const created = await transaction.territory.create({
        data: {
          ownerId: session.user.id,
          name: parsed.data.name,
          slug: slugifyTerritoryName(parsed.data.name),
          flag: parsed.data.flag,
          description: parsed.data.description,
          bannerImageUrl: parsed.data.bannerImageUrl,
          flagUrl: parsed.data.flagImageUrl,
          color: parsed.data.color,
          level: territoryLevel(hexes.length),
          statistics,
          hexCount: hexes.length
        }
      });
      const assignment = await transaction.hex.updateMany({
        where: {
          id: { in: hexes.map((hex) => hex.id) },
          ownerId: session.user.id,
          territoryId: null
        },
        data: { territoryId: created.id }
      });
      if (assignment.count !== hexes.length) {
        throw new Error("TERRITORY_HEX_ASSIGNMENT_CONFLICT");
      }
      return transaction.territory.findUniqueOrThrow({
        where: { id: created.id },
        include: { _count: { select: { hexes: true } } }
      });
    });

    return NextResponse.json({ territory }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERRITORY_HEX_ASSIGNMENT_CONFLICT") {
      return NextResponse.json(
        { error: "One or more selected hexes were assigned to another territory. Refresh and try again." },
        { status: 409 }
      );
    }
    console.error("Territory creation failed", error);
    return NextResponse.json({ error: "Territory could not be created." }, { status: 500 });
  }
}
