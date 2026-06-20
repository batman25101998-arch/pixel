import {
  cellToBoundary,
  cellToLatLng,
  gridDisk,
  latLngToCell,
  isValidCell,
  polygonToCells
} from "h3-js";
import { env } from "@/lib/env";

export type HexFeature = {
  type: "Feature";
  id: string;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: Record<string, unknown>;
};

export type EarthHex = {
  id: string;
  h3Index: string;
  latitude: number;
  longitude: number;
  owner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    founderNumber?: number | null;
    kingdomUnlockedAt?: Date | null;
  } | null;
  priceCents: number;
  status: "AVAILABLE" | "OWNED" | "FOR_SALE" | "LOCKED" | "BANNED";
  message: string;
  title: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  link: string | null;
};

export function cellForLngLat(lng: number, lat: number, resolution = env.HEX_RESOLUTION) {
  return latLngToCell(lat, lng, resolution);
}

export function centerForCell(h3Index: string) {
  const [lat, lng] = cellToLatLng(h3Index);
  return { latitude: lat, longitude: lng };
}

export function polygonForCell(h3Index: string) {
  const ring = cellToBoundary(h3Index, true).map(([lng, lat]) => [lng, lat]);
  ring.push(ring[0]);
  return ring;
}

export function cellsForBBox(west: number, south: number, east: number, north: number, resolution = env.HEX_RESOLUTION) {
  const clampedSouth = Math.max(-85, Math.min(85, south));
  const clampedNorth = Math.max(-85, Math.min(85, north));
  const polygon = [
    [
      [west, clampedSouth],
      [east, clampedSouth],
      [east, clampedNorth],
      [west, clampedNorth],
      [west, clampedSouth]
    ]
  ];
  return polygonToCells(polygon, resolution, true);
}

export function axialForCell(h3Index: string) {
  const [lat, lng] = cellToLatLng(h3Index);
  return {
    q: Math.round((lng + 180) * 10000),
    r: Math.round((lat + 90) * 10000)
  };
}

export function assertCell(value: string) {
  if (!isValidCell(value)) {
    throw new Error("Invalid hex index");
  }
}

export function neighbors(h3Index: string) {
  return gridDisk(h3Index, 1).filter((cell) => cell !== h3Index);
}

export function toFeature(hex: {
  id: string;
  h3Index: string;
  latitude: number | { toString(): string } | null;
  longitude: number | { toString(): string } | null;
  title: string;
  message: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  link: string | null;
  status: string;
  priceCents: number | bigint;
  owner: { id: string; displayName: string; avatarUrl: string | null; founderNumber?: number | null; kingdomUnlockedAt?: Date | null } | null;
}): HexFeature {
  const center = centerForCell(hex.h3Index);
  const latitude = hex.latitude == null ? center.latitude : Number(hex.latitude);
  const longitude = hex.longitude == null ? center.longitude : Number(hex.longitude);
  return {
    type: "Feature",
    id: hex.id,
    geometry: {
      type: "Polygon",
      coordinates: [polygonForCell(hex.h3Index)]
    },
    properties: {
      id: hex.id,
      h3Index: hex.h3Index,
      latitude,
      longitude,
      ownerId: hex.owner?.id ?? null,
      ownerName: hex.owner?.displayName ?? null,
      ownerFounderNumber: hex.owner?.founderNumber ?? null,
      ownerKingdomUnlocked: Boolean(hex.owner?.kingdomUnlockedAt),
      ownerImage: hex.avatarUrl ?? hex.owner?.avatarUrl ?? null,
      message: hex.message,
      title: hex.title,
      imageUrl: hex.imageUrl,
      externalLink: hex.link,
      status: hex.status,
      priceCents: Number(hex.priceCents)
    }
  };
}

export function virtualHexForCell(h3Index: string, priceCents = 100): EarthHex {
  assertCell(h3Index);
  const center = centerForCell(h3Index);
  return {
    id: h3Index,
    h3Index,
    latitude: center.latitude,
    longitude: center.longitude,
    owner: null,
    priceCents,
    status: "AVAILABLE",
    title: "",
    message: "",
    avatarUrl: null,
    imageUrl: null,
    link: null
  };
}

export function virtualFeatureForCell(h3Index: string, priceCents = 100) {
  return toFeature(virtualHexForCell(h3Index, priceCents));
}
