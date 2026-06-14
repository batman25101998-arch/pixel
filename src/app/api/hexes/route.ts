import { NextResponse } from "next/server";
import { cellToBoundary, cellToChildren, cellToLatLng, latLngToCell, polygonToCells } from "h3-js";

const emptyFeatureCollection = { type: "FeatureCollection", features: [] };

type RawFeature = unknown;

type FeatureCollection = {
  type: "FeatureCollection";
  features: RawFeature[];
};

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

function resolutionForZoom(zoom: number) {
  if (zoom < 3) return 2;
  if (zoom < 5) return 3;
  if (zoom < 7) return 4;
  if (zoom < 9) return 5;
  return 6;
}

function isLngLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function isLinearRing(value: unknown): value is [number, number][] {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(isLngLatPair) &&
    JSON.stringify(value[0]) === JSON.stringify(value[value.length - 1])
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bbox = parseBBox(url.searchParams.get("bbox"));
    const zoom = parseZoom(url.searchParams.get("zoom"));
    const take = parseTake(url.searchParams.get("take"));
    const includeVirtual = parseIncludeVirtual(url.searchParams.get("includeVirtual"));
    const resolution = resolutionForZoom(zoom);

    console.log("/api/hexes bbox", bbox, "zoom", zoom, "resolution", resolution, "includeVirtual", includeVirtual, "take", take);

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

    let cells = polygonToCells(polygon, resolution);
    console.log("/api/hexes generated cell count", cells.length);

    if (cells.length === 0) {
      const centerLat = (south + north) / 2;
      const centerLng = (west + east) / 2;
      const parent = latLngToCell(centerLat, centerLng, Math.max(0, resolution - 1));
      cells = cellToChildren(parent, resolution);
      console.log("/api/hexes fallback child cell count", cells.length);
    }

    let outputCells = cells;
    if (outputCells.length === 0) {
      const centerLat = (south + north) / 2;
      const centerLng = (west + east) / 2;
      const fallbackParent = latLngToCell(centerLat, centerLng, Math.max(0, resolution - 2));
      outputCells = cellToChildren(fallbackParent, resolution);
      console.log("/api/hexes center fallback cell count", outputCells.length);
    }

    const features = outputCells.slice(0, take).map((cell) => {
      const boundary = cellToBoundary(cell, true);
      const ring = [...boundary, boundary[0]];
      const [lat, lng] = cellToLatLng(cell);
      return {
        type: "Feature",
        id: cell,
        geometry: {
          type: "Polygon",
          coordinates: [ring]
        },
        properties: {
          id: cell,
          h3Index: cell,
          status: "AVAILABLE",
          price: 1,
          priceCents: 100,
          latitude: lat,
          longitude: lng
        }
      };
    });

    const validFeatures = validateFeatures(features);
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

    const h3Index = latLngToCell(body.lat, body.lng, 5);
    return NextResponse.json({ h3Index });
  } catch (error) {
    console.error("/api/hexes POST error:", error);
    return NextResponse.json({ error: "Unable to compute hex index." }, { status: 500 });
  }
}
