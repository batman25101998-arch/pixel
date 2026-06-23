import { NextResponse } from "next/server";
import { cellToLatLng, isValidCell } from "h3-js";
import { prisma } from "@/lib/prisma";
import { cellForLngLat, toFeature } from "@/lib/hex";
import { env, isDemoMode } from "@/lib/env";

type SearchResult = {
  type: "hex" | "user" | "territory" | "geocode";
  label: string;
  latitude: number;
  longitude: number;
  zoom: number;
  h3Index?: string;
  bbox?: [number, number, number, number];
  properties?: Record<string, unknown>;
};

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  addresstype?: string;
  boundingbox?: [string, string, string, string];
};

function hexResult(
  h3Index: string,
  label: string,
  properties?: Record<string, unknown>
): SearchResult {
  const [latitude, longitude] = cellToLatLng(h3Index);
  return { type: "hex", label, h3Index, latitude, longitude, zoom: 13, properties };
}

function placeZoom(place: NominatimResult) {
  const kind = place.addresstype ?? place.type;
  if (kind === "country") return 5;
  if (["city", "town", "village", "municipality", "borough"].includes(kind ?? "")) return 10;
  return 13;
}

async function geocode(query: string): Promise<SearchResult[]> {
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("limit", "5");

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": `OwnAPixelOfEarth/1.0 (${env.NEXT_PUBLIC_APP_URL})`
      },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) {
      console.error("Nominatim search failed", response.status, response.statusText);
      return [];
    }

    const places = (await response.json()) as NominatimResult[];
    return places.flatMap((place) => {
      const latitude = Number(place.lat);
      const longitude = Number(place.lon);
      if (!place.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

      const values = place.boundingbox?.map(Number);
      const bbox = values?.length === 4 && values.every(Number.isFinite)
        ? [values[2], values[0], values[3], values[1]] as [number, number, number, number]
        : undefined;
      return [{
        type: "geocode" as const,
        label: place.display_name,
        latitude,
        longitude,
        zoom: placeZoom(place),
        bbox
      }];
    });
  } catch (error) {
    console.error("Nominatim search could not be completed", error);
    return [];
  }
}

async function persistedHexResult(h3Index: string, label = h3Index) {
  if (isDemoMode) return hexResult(h3Index, label);
  try {
    const hex = await prisma.hex.findUnique({
      where: { h3Index },
      include: { owner: { select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
    });
    const properties = hex ? toFeature(hex).properties as Record<string, unknown> : undefined;
    return hexResult(h3Index, label, properties);
  } catch (error) {
    console.error("Exact hex search could not reach the database", error);
    return hexResult(h3Index, label);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json({ results: [] });

  if (isValidCell(query)) {
    return NextResponse.json({ results: [await persistedHexResult(query)] });
  }

  const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1]);
    const longitude = Number(coordinateMatch[2]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      const h3Index = cellForLngLat(longitude, latitude);
      return NextResponse.json({ results: [await persistedHexResult(h3Index, `${latitude}, ${longitude}`)] });
    }
    return NextResponse.json({ results: [] });
  }

  if (!isDemoMode) {
    try {
      const [users, territories] = await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: query, mode: "insensitive" } },
              { displayName: { contains: query, mode: "insensitive" } }
            ],
            ownedHexes: { some: {} }
          },
          take: 8,
          orderBy: { ownedHexes: { _count: "desc" } },
          select: {
            username: true,
            displayName: true,
            ownedHexes: { take: 1, orderBy: { purchaseDate: "desc" }, select: { h3Index: true, latitude: true, longitude: true } }
          }
        }),
        prisma.territory.findMany({
          where: { name: { contains: query, mode: "insensitive" }, status: "ACTIVE" },
          take: 8,
          orderBy: { hexCount: "desc" },
          select: {
            name: true,
            level: true,
            owner: { select: { displayName: true } },
            hexes: { take: 1, select: { h3Index: true, latitude: true, longitude: true } }
          }
        })
      ]);

      const internalResults: SearchResult[] = [
        ...users.flatMap((user) => {
          const hex = user.ownedHexes[0];
          if (!hex) return [];
          const [fallbackLat, fallbackLng] = cellToLatLng(hex.h3Index);
          return [{
            type: "user" as const,
            label: `${user.displayName} (@${user.username})`,
            latitude: hex.latitude ?? fallbackLat,
            longitude: hex.longitude ?? fallbackLng,
            zoom: 10
          }];
        }),
        ...territories.flatMap((territory) => {
          const hex = territory.hexes[0];
          if (!hex) return [];
          const [fallbackLat, fallbackLng] = cellToLatLng(hex.h3Index);
          return [{
            type: "territory" as const,
            label: `${territory.name} · ${territory.level.toLowerCase()} by ${territory.owner.displayName}`,
            latitude: hex.latitude ?? fallbackLat,
            longitude: hex.longitude ?? fallbackLng,
            zoom: 9
          }];
        })
      ];
      if (internalResults.length) return NextResponse.json({ results: internalResults });
    } catch (error) {
      console.error("Internal search could not reach the database", error);
    }
  }

  return NextResponse.json({ results: await geocode(query) });
}
