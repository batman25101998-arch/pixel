import { gridDisk } from "h3-js";

export type TerritoryLevel = "Unranked" | "Village" | "City" | "Kingdom" | "Empire";

export type GamificationBadgeId =
  | "founder"
  | "first-hex"
  | "village-owner"
  | "city-builder"
  | "kingdom-founder"
  | "collector-100"
  | "marketplace-seller";

export type GamificationBadge = {
  id: GamificationBadgeId;
  label: string;
  description: string;
};

type HexLike = string | { h3Index: string; priceCents?: number };

export type GamificationUser = {
  id: string;
  name: string;
  founderNumber?: number | null;
  ownedHexes: HexLike[];
  territories?: Array<{ hexIndexes?: string[]; hexCount?: number }>;
  marketplaceListings?: number;
  estimatedValueCents?: number;
  createdAt?: string | Date;
};

function indexForHex(hex: HexLike) {
  return typeof hex === "string" ? hex : hex.h3Index;
}

export function getTerritoryLevel(connectedHexCount: number): TerritoryLevel {
  if (connectedHexCount >= 5000) return "Empire";
  if (connectedHexCount >= 1000) return "Kingdom";
  if (connectedHexCount >= 100) return "City";
  if (connectedHexCount >= 10) return "Village";
  return "Unranked";
}

export function getConnectedHexGroups(hexes: HexLike[]) {
  const remaining = new Set(hexes.map(indexForHex));
  const groups: string[][] = [];

  while (remaining.size) {
    const start = remaining.values().next().value as string;
    const queue = [start];
    const group: string[] = [];
    remaining.delete(start);

    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      group.push(current);
      for (const neighbor of gridDisk(current, 1)) {
        if (remaining.delete(neighbor)) queue.push(neighbor);
      }
    }
    groups.push(group);
  }

  return groups.sort((left, right) => right.length - left.length);
}

export function canCreateTerritory(hexes: HexLike[]) {
  return (getConnectedHexGroups(hexes)[0]?.length ?? 0) >= 10;
}

export function getUserBadges(user: GamificationUser): GamificationBadge[] {
  const ownedCount = user.ownedHexes.length;
  const largestConnected = getConnectedHexGroups(user.ownedHexes)[0]?.length ?? 0;
  const level = getTerritoryLevel(largestConnected);
  const badges: GamificationBadge[] = [];

  if (user.founderNumber) badges.push({ id: "founder", label: "Founder", description: `Founder #${user.founderNumber}` });
  if (ownedCount >= 1) badges.push({ id: "first-hex", label: "First Hex", description: "Purchased a first collectible hex" });
  if (["Village", "City", "Kingdom", "Empire"].includes(level)) badges.push({ id: "village-owner", label: "Village Owner", description: "Owns 10 connected hexes" });
  if (["City", "Kingdom", "Empire"].includes(level)) badges.push({ id: "city-builder", label: "City Builder", description: "Owns 100 connected hexes" });
  if (["Kingdom", "Empire"].includes(level)) badges.push({ id: "kingdom-founder", label: "Kingdom Founder", description: "Owns 1,000 connected hexes" });
  if (ownedCount >= 100) badges.push({ id: "collector-100", label: "Collector 100", description: "Owns at least 100 hexes" });
  if ((user.marketplaceListings ?? 0) > 0) badges.push({ id: "marketplace-seller", label: "Marketplace Seller", description: "Listed a collectible hex" });
  return badges;
}

export function calculateLeaderboard(users: GamificationUser[]) {
  const enriched = users.map((user) => {
    const groups = getConnectedHexGroups(user.ownedHexes);
    const largestConnected = groups[0]?.length ?? 0;
    const settlementCount = groups.filter((group) => getTerritoryLevel(group.length) !== "Unranked").length;
    const estimatedValueCents = user.estimatedValueCents ?? user.ownedHexes.reduce(
      (sum, hex) => sum + (typeof hex === "string" ? 100 : hex.priceCents ?? 100),
      0
    );
    return { ...user, largestConnected, settlementCount, estimatedValueCents };
  });

  return {
    mostHexesOwned: [...enriched].sort((left, right) => right.ownedHexes.length - left.ownedHexes.length),
    largestTerritory: [...enriched].sort((left, right) => right.largestConnected - left.largestConnected),
    mostSettlements: [...enriched].sort((left, right) => right.settlementCount - left.settlementCount),
    mostValuableHexes: [...enriched].sort((left, right) => right.estimatedValueCents - left.estimatedValueCents),
    newestOwners: [...enriched].sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
  };
}
