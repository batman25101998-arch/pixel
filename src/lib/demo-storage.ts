import { cellToLatLng, gridDisk, isValidCell, latLngToCell } from "h3-js";
import { DEMO_USER, demoListings } from "@/lib/demo";

const HEXES_KEY = "pixel-world-demo-owned-hexes";
const TERRITORIES_KEY = "pixel-world-demo-territories";
const OFFERS_KEY = "pixel-world-demo-hex-offers";
const TRADE_OFFERS_KEY = "pixel-world-demo-trade-offers";
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
  type: "hex";
  label: string;
  h3Index: string;
  latitude: number;
  longitude: number;
  hex?: DemoHex;
};

export type DemoOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "CANCELLED" | "EXPIRED";

export type DemoHexOffer = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  targetHexId: string;
  targetH3Index: string;
  amountCents: number;
  status: DemoOfferStatus;
  message: string;
  createdAt: string;
  expiresAt: string;
};

export type DemoTradeOffer = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  offeredHexIds: string[];
  requestedHexIds: string[];
  extraAmountCents: number;
  status: DemoOfferStatus;
  message: string;
  createdAt: string;
  expiresAt: string;
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

export function getDemoOffers() {
  const saved = readArray<DemoHexOffer>(OFFERS_KEY);
  if (saved.length) return saved;
  const owned = getDemoOwnedHexes().find((hex) => hex.ownerId === DEMO_USER.id);
  if (!owned) return [];
  return [{
    id: `demo-offer-received-${owned.id}`,
    fromUserId: "demo-collector",
    fromUserName: "Pixel Collector",
    toUserId: DEMO_USER.id,
    toUserName: DEMO_USER.name,
    targetHexId: owned.id,
    targetH3Index: owned.h3Index,
    amountCents: 500,
    status: "PENDING" as const,
    message: "I would love to add this location to my collection.",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
  }];
}

export function createDemoHexOffer(input: { targetHexId: string; targetH3Index: string; toUserId: string; toUserName: string; amountCents: number; message?: string }) {
  if (input.toUserId === DEMO_USER.id) throw new Error("You cannot make an offer on your own hex.");
  const offer: DemoHexOffer = {
    id: `demo-offer-${Date.now()}`,
    fromUserId: DEMO_USER.id,
    fromUserName: DEMO_USER.name,
    toUserId: input.toUserId,
    toUserName: input.toUserName,
    targetHexId: input.targetHexId,
    targetH3Index: input.targetH3Index,
    amountCents: input.amountCents,
    status: "PENDING",
    message: input.message?.trim() ?? "",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
  };
  writeArray(OFFERS_KEY, [offer, ...getDemoOffers()]);
  return offer;
}

export function updateDemoHexOffer(id: string, action: "accept" | "reject" | "cancel" | "counter", amountCents?: number) {
  const offers = getDemoOffers();
  const offer = offers.find((item) => item.id === id);
  if (!offer) throw new Error("Offer not found.");
  const status: DemoOfferStatus = action === "accept" ? "ACCEPTED" : action === "reject" ? "REJECTED" : action === "cancel" ? "CANCELLED" : "COUNTERED";
  const updated = { ...offer, status, amountCents: action === "counter" ? amountCents ?? offer.amountCents : offer.amountCents };
  writeArray(OFFERS_KEY, offers.map((item) => item.id === id ? updated : item));
  if (action === "accept") {
    const hex = getDemoOwnedHexes().find((item) => item.id === offer.targetHexId);
    if (hex && hex.ownerId === offer.toUserId) saveDemoHex({ ...hex, ownerId: offer.fromUserId, ownerName: offer.fromUserName, territoryId: undefined } as DemoHex);
  }
  return updated;
}

export function getDemoTradeOffers() {
  return readArray<DemoTradeOffer>(TRADE_OFFERS_KEY);
}

export function createDemoTradeOffer(input: Omit<DemoTradeOffer, "id" | "fromUserId" | "fromUserName" | "status" | "createdAt" | "expiresAt">) {
  const trade: DemoTradeOffer = {
    ...input,
    id: `demo-trade-${Date.now()}`,
    fromUserId: DEMO_USER.id,
    fromUserName: DEMO_USER.name,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
  };
  writeArray(TRADE_OFFERS_KEY, [trade, ...getDemoTradeOffers()]);
  return trade;
}

export function updateDemoTradeOffer(id: string, action: "accept" | "reject" | "cancel") {
  const trades = getDemoTradeOffers();
  const trade = trades.find((item) => item.id === id);
  if (!trade) throw new Error("Trade offer not found.");
  if (action === "accept" && trade.extraAmountCents > 0) throw new Error("Demo cash settlement is not available yet.");
  if (action === "accept") {
    const hexes = getDemoOwnedHexes();
    const offered = hexes.filter((hex) => trade.offeredHexIds.includes(hex.id) && hex.ownerId === trade.fromUserId);
    const requested = hexes.filter((hex) => trade.requestedHexIds.includes(hex.id) && hex.ownerId === trade.toUserId);
    if (offered.length !== trade.offeredHexIds.length || requested.length !== trade.requestedHexIds.length) {
      throw new Error("Hex ownership changed after this trade was proposed.");
    }
    for (const hex of offered) saveDemoHex({ ...hex, ownerId: trade.toUserId, ownerName: trade.toUserName });
    for (const hex of requested) saveDemoHex({ ...hex, ownerId: trade.fromUserId, ownerName: trade.fromUserName });
  }
  const status: DemoOfferStatus = action === "accept" ? "ACCEPTED" : action === "reject" ? "REJECTED" : "CANCELLED";
  const updated = { ...trade, status };
  writeArray(TRADE_OFFERS_KEY, trades.map((item) => item.id === id ? updated : item));
  return updated;
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
