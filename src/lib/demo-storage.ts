import { cellToLatLng, gridDisk, isValidCell, latLngToCell } from "h3-js";
import { DEMO_USER, demoListings } from "@/lib/demo";

const HEXES_KEY = "pixel-world-demo-owned-hexes";
const TERRITORIES_KEY = "pixel-world-demo-territories";
export const DEMO_STORAGE_EVENT = "pixel-world-demo-storage-changed";

export type DemoHex = {
  id: string;
  h3Index: string;
  latitude: number;
  longitude: number;
  ownerId: string;
  ownerName: string;
  title: string;
  message: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  externalLink: string | null;
  priceCents: number;
  purchaseDate: string;
  forSale: boolean;
  salePriceCents: number | null;
};

export type DemoTerritory = {
  id: string;
  name: string;
  description: string;
  bannerImageUrl: string | null;
  flagImageUrl: string | null;
  color: string;
  hexIndexes: string[];
  createdAt: string;
};

export type DemoSearchResult = {
  type: "hex" | "territory";
  label: string;
  h3Index: string;
  latitude: number;
  longitude: number;
  hex?: DemoHex;
  territory?: DemoTerritory;
};

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(DEMO_STORAGE_EVENT));
}

function safeHttpUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeHex(hex: Partial<DemoHex> & Pick<DemoHex, "h3Index" | "latitude" | "longitude">): DemoHex {
  return {
    id: hex.id ?? `demo-${hex.h3Index}`,
    h3Index: hex.h3Index,
    latitude: hex.latitude,
    longitude: hex.longitude,
    ownerId: hex.ownerId ?? DEMO_USER.id,
    ownerName: hex.ownerName ?? DEMO_USER.name,
    title: hex.title ?? "",
    message: hex.message ?? "",
    avatarUrl: safeHttpUrl(hex.avatarUrl),
    imageUrl: safeHttpUrl(hex.imageUrl),
    externalLink: safeHttpUrl(hex.externalLink),
    priceCents: hex.priceCents ?? 100,
    purchaseDate: hex.purchaseDate ?? new Date().toISOString(),
    forSale: hex.forSale ?? false,
    salePriceCents: hex.salePriceCents ?? null
  };
}

export function getDemoOwnedHexes() {
  return readArray<DemoHex>(HEXES_KEY).map((hex) => normalizeHex(hex));
}

export function saveDemoHex(hex: DemoHex) {
  const normalized = normalizeHex(hex);
  const current = getDemoOwnedHexes();
  writeArray(HEXES_KEY, [normalized, ...current.filter((item) => item.h3Index !== normalized.h3Index)]);
  return normalized;
}

export function buyDemoHex(input: {
  h3Index: string;
  latitude: number;
  longitude: number;
  priceCents?: number;
  title?: string;
  message?: string;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  externalLink?: string | null;
}) {
  return saveDemoHex(normalizeHex({
    ...input,
    ownerId: DEMO_USER.id,
    ownerName: DEMO_USER.name,
    forSale: false,
    salePriceCents: null,
    purchaseDate: new Date().toISOString()
  }));
}

export function updateDemoHexMetadata(
  h3Index: string,
  updates: Partial<Pick<DemoHex, "title" | "message" | "avatarUrl" | "imageUrl" | "externalLink" | "forSale" | "salePriceCents">>
) {
  const hex = getDemoOwnedHexes().find((item) => item.h3Index === h3Index);
  if (!hex) throw new Error("Demo hex is not owned.");
  return saveDemoHex({ ...hex, ...updates });
}

function connected(hexIndexes: string[]) {
  if (hexIndexes.length < 2) return false;
  const remaining = new Set(hexIndexes);
  const queue = [hexIndexes[0]];
  remaining.delete(hexIndexes[0]);
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    for (const neighbor of gridDisk(current, 1)) {
      if (remaining.delete(neighbor)) queue.push(neighbor);
    }
  }
  return remaining.size === 0;
}

export function createDemoTerritory(input: {
  name: string;
  description: string;
  bannerImageUrl?: string | null;
  flagImageUrl?: string | null;
  color?: string;
  hexIndexes: string[];
}) {
  const owned = new Set(getDemoOwnedHexes().filter((hex) => hex.ownerId === DEMO_USER.id).map((hex) => hex.h3Index));
  const uniqueIndexes = Array.from(new Set(input.hexIndexes));
  if (!input.name.trim()) throw new Error("Territory name is required.");
  if (uniqueIndexes.some((index) => !owned.has(index))) throw new Error("Every territory hex must be owned by Demo User.");
  if (uniqueIndexes.length < 10 || !connected(uniqueIndexes)) throw new Error("Choose at least 10 connected owned hexes.");

  const territory: DemoTerritory = {
    id: `demo-territory-${Date.now()}`,
    name: input.name.trim(),
    description: input.description.trim(),
    bannerImageUrl: safeHttpUrl(input.bannerImageUrl),
    flagImageUrl: safeHttpUrl(input.flagImageUrl),
    color: input.color ?? "#22c55e",
    hexIndexes: uniqueIndexes,
    createdAt: new Date().toISOString()
  };
  const existing = getDemoTerritories().filter((item) => !item.hexIndexes.some((index) => uniqueIndexes.includes(index)));
  writeArray(TERRITORIES_KEY, [territory, ...existing]);
  return territory;
}

export function getDemoTerritories() {
  return readArray<DemoTerritory>(TERRITORIES_KEY);
}

export function listDemoMarketplace() {
  return getDemoOwnedHexes().filter((hex) => hex.forSale && hex.salePriceCents && hex.salePriceCents > 0);
}

function resultForCell(h3Index: string, label: string): DemoSearchResult {
  const owned = getDemoOwnedHexes().find((hex) => hex.h3Index === h3Index);
  const [latitude, longitude] = owned ? [owned.latitude, owned.longitude] : cellToLatLng(h3Index);
  return { type: "hex", label, h3Index, latitude, longitude, hex: owned };
}

export function searchDemo(query: string): DemoSearchResult[] {
  const normalized = query.trim();
  if (!normalized) return [];
  const coordinateMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1]);
    const longitude = Number(coordinateMatch[2]);
    if (longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90) {
      return [resultForCell(latLngToCell(latitude, longitude, 5), `${longitude}, ${latitude}`)];
    }
  }
  if (isValidCell(normalized)) return [resultForCell(normalized, normalized)];

  const needle = normalized.toLowerCase();
  const territoryResults = getDemoTerritories()
    .filter((territory) => territory.name.toLowerCase().includes(needle))
    .flatMap((territory) => {
      const h3Index = territory.hexIndexes[0];
      if (!h3Index) return [];
      const [latitude, longitude] = cellToLatLng(h3Index);
      return [{ type: "territory" as const, label: territory.name, h3Index, latitude, longitude, territory }];
    });
  if (territoryResults.length) return territoryResults;

  if (DEMO_USER.name.toLowerCase().includes(needle) || "demo-user".includes(needle)) {
    return getDemoOwnedHexes().map((hex) => ({
      type: "hex" as const,
      label: `${DEMO_USER.name} · ${hex.h3Index}`,
      h3Index: hex.h3Index,
      latitude: hex.latitude,
      longitude: hex.longitude,
      hex
    }));
  }

  const listing = demoListings.find((item) => item.ownerName.toLowerCase().includes(needle));
  return listing ? [resultForCell(listing.h3Index, listing.ownerName)] : [];
}
