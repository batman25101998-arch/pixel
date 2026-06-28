import { NextResponse } from "next/server";
import { cellToBoundary, cellToChildren, cellToLatLng, latLngToCell, polygonToCells } from "h3-js";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/env";

const emptyFeatureCollection = { type: "FeatureCollection", features: [] };
const FIXED_H3_RESOLUTION = 5;

type RawFeature = unknown;

type FeatureCollection = {
  type: "FeatureCollection";
  features: RawFeature[];
};

type LngLat = [number, number];

type MockHexStatus = "AVAILABLE" | "OWNED";
type PersistedHex = {
  id: string;
  h3Index: string;
  status: string;
  ownerId: string;
  owner: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    founderNumber: number | null;
    kingdomUnlockedAt: Date | null;
  };
  message: string;
  title: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  link: string | null;
  priceCents: bigint;
  purchaseDate: Date;
};

const continentBoxes = [
  { name: "north-america", west: -168, south: 7, east: -52, north: 72 },
  { name: "south-america", west: -82, south: -56, east: -34, north: 13 },
  { name: "europe", west: -12, south: 35, east: 42, north: 72 },
  { name: "africa", west: -20, south: -35, east: 52, north: 38 },
  { name: "asia", west: 26, south: 5, east: 150, north: 78 },
  { name: "southeast-asia", west: 95, south: -12, east: 155, north: 25 },
  { name: "australia", west: 112, south: -45, east: 154, north: -10 },
  { name: "greenland", west: -74, south: 58, east: -12, north: 84 }
];

function parseBBox(value: string | null): number[] | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((item) => !Number.isFinite(item))) {
    return null;
  }
  return parts;
}

function parseZoom(value: string | null) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) return 5;
  return parsed;
}

function parseTake(value: string | null) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 2000;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 10000);
}

function parseIncludeVirtual(value: string | null) {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseDebug(value: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "zagreb") {
    return "zagreb";
  }
  return null;
}

function isApproximateLand(latitude: number, longitude: number) {
  return continentBoxes.some(
    (box) =>
      longitude >= box.west &&
      longitude <= box.east &&
      latitude >= box.south &&
      latitude <= box.north
  );
}

function hashCell(cell: string) {
  let hash = 2166136261;
  for (let index = 0; index < cell.length; index += 1) {
    hash ^= cell.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mockStatusForCell(cell: string, isLand: boolean): MockHexStatus {
  if (!isLand) return "AVAILABLE";

  const bucket = hashCell(cell) % 1000;
  if (bucket < 150) return "OWNED";
  return "AVAILABLE";
}

function mockOwnerForStatus(status: MockHexStatus, cell: string) {
  if (status === "OWNED") {
    return {
      ownerId: `mock-owner-${hashCell(cell) % 32}`,
      ownerName: `Earth Owner ${hashCell(cell) % 32}`
    };
  }

  return {
    ownerId: null,
    ownerName: null
  };
}

function isLngLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function sameCoordinate(a: LngLat, b: LngLat) {
  return a[0] === b[0] && a[1] === b[1];
}

function isLinearRing(value: unknown): value is [number, number][] {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(isLngLatPair) &&
    sameCoordinate(value[0], value[value.length - 1])
  );
}

function isValidPolygonCoordinates(value: unknown): value is [number, number][][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isLinearRing)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidFeature(value: unknown): value is { type: "Feature"; geometry: { type: "Polygon"; coordinates: [number, number][][] }; properties: Record<string, unknown> } {
  if (!isPlainObject(value)) return false;

  const type = (value as any).type;
  const geometry = (value as any).geometry;
  const properties = (value as any).properties;

  return (
    type === "Feature" &&
    isPlainObject(geometry) &&
    geometry.type === "Polygon" &&
    isValidPolygonCoordinates(geometry.coordinates) &&
    isPlainObject(properties)
  );
}

function validateFeatures(features: unknown[]): unknown[] {
  const valid: unknown[] = [];
  features.forEach((feature, index) => {
    if (isValidFeature(feature)) {
      valid.push(feature);
      return;
    }

    console.error("/api/hexes invalid GeoJSON feature at index", index, feature);
  });
  return valid;
}

function approximateBBoxCellCount(west: number, south: number, east: number, north: number) {
  const width = Math.abs(east - west);
  const height = Math.abs(north - south);
  return width * height * 3.8 ** FIXED_H3_RESOLUTION;
}

function sampledCellsForBBox(west: number, south: number, east: number, north: number, take: number) {
  const cells = new Set<string>();
  const target = Math.min(take, 10000);
  const columns = Math.ceil(Math.sqrt(target * 2.15));
  const rows = Math.ceil(target / columns);
  const lngStep = (east - west) / Math.max(columns - 1, 1);
  const latStep = (north - south) / Math.max(rows - 1, 1);

  for (let row = 0; row < rows; row += 1) {
    const lat = Math.max(-85, Math.min(85, south + latStep * row));
    for (let column = 0; column < columns; column += 1) {
      const lng = Math.max(-180, Math.min(180, west + lngStep * column));
      cells.add(latLngToCell(lat, lng, FIXED_H3_RESOLUTION));
      if (cells.size >= target) return Array.from(cells);
    }
  }

  return Array.from(cells);
}

function cellToPolygonFeature(cell: string, persistedHex?: PersistedHex, currentUserId?: string) {
  const boundary = cellToBoundary(cell);
  const ring = boundary.map(([lat, lng]) => [lng, lat] as LngLat);
  ring.push(ring[0]);

  if (!isLinearRing(ring)) {
    throw new Error(`Invalid H3 boundary for cell ${cell}`);
  }

  const [lat, lng] = cellToLatLng(cell);
  const isLand = isApproximateLand(lat, lng);
  const mockStatus = isDemoMode ? mockStatusForCell(cell, isLand) : "AVAILABLE";
  const status: MockHexStatus | string = persistedHex
    ? persistedHex.ownerId === currentUserId
      ? "MY_OWNED"
      : "OWNED"
    : mockStatus;
  const owner = persistedHex
    ? {
        ownerId: persistedHex.ownerId,
      ownerName: persistedHex.owner.displayName
      }
    : isDemoMode
      ? mockOwnerForStatus(mockStatus, cell)
      : { ownerId: null, ownerName: null };

  return {
    type: "Feature",
    id: persistedHex?.id ?? cell,
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
    properties: {
      id: persistedHex?.id ?? cell,
      h3Index: cell,
      resolution: FIXED_H3_RESOLUTION,
      status,
      isLand,
      isOcean: !isLand,
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
      ownerUsername: persistedHex?.owner.username ?? null,
      ownerImage: persistedHex?.avatarUrl ?? persistedHex?.owner.avatarUrl ?? null,
      ownerFounderNumber: persistedHex?.owner.founderNumber ?? null,
      ownerKingdomUnlocked: Boolean(persistedHex?.owner.kingdomUnlockedAt),
      price: 1,
      priceCents: persistedHex ? Number(persistedHex.priceCents) : 100,
      latitude: lat,
      longitude: lng,
      message: persistedHex?.message ?? "",
      title: persistedHex?.title ?? "",
      imageUrl: persistedHex?.imageUrl ?? null,
      externalLink: persistedHex?.link ?? null,
      purchaseDate: persistedHex?.purchaseDate.toISOString() ?? null,
    },
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const url = new URL(request.url);
    const bbox = parseBBox(url.searchParams.get("bbox"));
    const zoom = parseZoom(url.searchParams.get("zoom"));
    const take = parseTake(url.searchParams.get("take"));
    const includeVirtual = parseIncludeVirtual(url.searchParams.get("includeVirtual"));
    const debug = parseDebug(url.searchParams.get("debug"));

    console.log("/api/hexes bbox", bbox, "zoom", zoom, "resolution", FIXED_H3_RESOLUTION, "includeVirtual", includeVirtual, "take", take, "debug", debug);

    if (debug === "zagreb") {
      const zagrebCell = latLngToCell(45.815, 15.981, FIXED_H3_RESOLUTION);
      const feature = cellToPolygonFeature(zagrebCell, undefined, session?.user?.id);
      console.log("/api/hexes debug first feature coordinates", feature.geometry.coordinates[0]);
      return NextResponse.json({ type: "FeatureCollection", features: [feature] });
    }

    if (!bbox) {
      return NextResponse.json(emptyFeatureCollection);
    }

    const west = bbox[0];
    const south = bbox[1];
    const east = bbox[2];
    const north = bbox[3];

    if (!includeVirtual) {
      return NextResponse.json(emptyFeatureCollection);
    }

    const polygon = [
      [
        [south, west],
        [south, east],
        [north, east],
        [north, west],
        [south, west]
      ]
    ];

    const estimatedCellCount = approximateBBoxCellCount(west, south, east, north);
    let cells = estimatedCellCount > take * 3
      ? sampledCellsForBBox(west, south, east, north, take)
      : polygonToCells(polygon, FIXED_H3_RESOLUTION);
    console.log("/api/hexes generated cell count", cells.length);

    if (cells.length === 0) {
      const centerLat = (south + north) / 2;
      const centerLng = (west + east) / 2;
      const parent = latLngToCell(centerLat, centerLng, Math.max(0, FIXED_H3_RESOLUTION - 1));
      cells = cellToChildren(parent, FIXED_H3_RESOLUTION);
      console.log("/api/hexes fallback child cell count", cells.length);
    }

    let outputCells = cells;
    if (outputCells.length === 0) {
      const centerLat = (south + north) / 2;
      const centerLng = (west + east) / 2;
      const fallbackParent = latLngToCell(centerLat, centerLng, Math.max(0, FIXED_H3_RESOLUTION - 2));
      outputCells = cellToChildren(fallbackParent, FIXED_H3_RESOLUTION);
      console.log("/api/hexes center fallback cell count", outputCells.length);
    }

    const visibleCells = outputCells.slice(0, take);
    let persistedHexes: PersistedHex[] = [];
    if (!isDemoMode) try {
      persistedHexes = (await prisma.hex.findMany({
        where: {
          h3Index: { in: visibleCells }
        },
        include: {
          owner: {
            select: {
              displayName: true,
              username: true,
              avatarUrl: true,
              founderNumber: true,
              kingdomUnlockedAt: true
            }
          }
        }
      })) as PersistedHex[];
    } catch (error) {
      console.error("/api/hexes persisted lookup failed:", error);
    }
    const persistedByCell = new Map(persistedHexes.map((hex) => [hex.h3Index, hex]));
    const features = visibleCells.map((cell) => cellToPolygonFeature(cell, persistedByCell.get(cell), session?.user?.id));

    const validFeatures = validateFeatures(features);
    if (validFeatures.length > 0 && isValidFeature(validFeatures[0])) {
      console.log("/api/hexes first feature coordinates", validFeatures[0].geometry.coordinates[0]);
    }
    console.log("/api/hexes returned feature count", validFeatures.length);
    return NextResponse.json({ type: "FeatureCollection", features: validFeatures });
  } catch (error) {
    console.error("/api/hexes GET error:", error);
    return NextResponse.json(emptyFeatureCollection);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lng?: number; lat?: number };
    if (typeof body.lng !== "number" || typeof body.lat !== "number" || !Number.isFinite(body.lng) || !Number.isFinite(body.lat)) {
      return NextResponse.json({ error: "Longitude and latitude are required." }, { status: 400 });
    }

    const h3Index = latLngToCell(body.lat, body.lng, FIXED_H3_RESOLUTION);
    return NextResponse.json({ h3Index });
  } catch (error) {
    console.error("/api/hexes POST error:", error);
    return NextResponse.json({ error: "Unable to compute hex index." }, { status: 500 });
  }
}
