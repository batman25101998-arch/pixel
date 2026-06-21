import type { GlobalRankings } from "@/lib/rankings";
import { formatNumber } from "@/lib/utils";

export const DEMO_USER = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@pixel.earth",
  balanceCents: 12_450,
  founderNumber: 8422,
  joinedAt: "2026-01-01T12:00:00.000Z"
} as const;

export const isClientDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const demoListings = [
  { id: "demo-listing-1", h3Index: "852a1073fffffff", ownerName: "Atlas Nova", priceCents: 350, message: "A bright corner of Manhattan." },
  { id: "demo-listing-2", h3Index: "851fb467fffffff", ownerName: "Terra Maker", priceCents: 525, message: "Near the heart of Paris." },
  { id: "demo-listing-3", h3Index: "852f5a37fffffff", ownerName: "Pixel Shogun", priceCents: 275, message: "Tokyo lights, forever." },
  { id: "demo-listing-4", h3Index: "85a8a06bfffffff", ownerName: "Sun Seeker", priceCents: 450, message: "A coastal piece of Brazil." },
  { id: "demo-listing-5", h3Index: "85be0e37fffffff", ownerName: "World Walker", priceCents: 625, message: "A landmark tile in Sydney." },
  { id: "demo-listing-6", h3Index: "85194ad3fffffff", ownerName: "Civic Founder", priceCents: 190, message: "A small piece of London." }
] as const;

const demoOwners = [
  ["aurora", "Aurora Guild", 92456, 12],
  ["geoking", "GeoKing", 78124, 41],
  ["atlas", "Atlas Nova", 60402, 28],
  ["traveler", "Traveler88", 45190, 142],
  ["pixel", "PixelTrader", 33750, 67]
] as const;

function ranked(valueIndex: 2 | 3, multiplier = 1) {
  return demoOwners.map(([id, name, owned, countries], index) => ({
    id,
    name,
    image: null,
    founderNumber: index + 1,
    kingdomUnlocked: Number(owned) >= 1000,
    value: Number(valueIndex === 2 ? owned : countries) * multiplier,
    secondary: valueIndex === 2 ? `${countries} countries` : `${formatNumber(owned)} hexes`
  }));
}

export const demoRankings: GlobalRankings = {
  largestTerritories: ranked(2),
  mostOwnedHexes: ranked(2),
  highestValue: ranked(2, 100),
  mostCountries: ranked(3),
  mostSettlements: demoOwners.map(([id, name, owned], index) => ({
    id: `${id}-settlements`,
    name,
    image: null,
    founderNumber: index + 1,
    kingdomUnlocked: Number(owned) >= 1000,
    value: [18, 14, 11, 8, 6][index] ?? 0,
    secondary: "Villages, cities, and kingdoms"
  })),
  newestOwners: demoOwners.map(([id, name], index) => ({
    id: `${id}-newest`,
    name,
    image: null,
    founderNumber: index + 1,
    kingdomUnlocked: index < 3,
    value: Date.now() - index * 86_400_000,
    secondary: "New owner"
  })),
  founderRanking: demoOwners.map(([id, name, owned], index) => ({
    id: `${id}-founder`,
    name,
    image: null,
    founderNumber: index + 1,
    kingdomUnlocked: Number(owned) >= 1000,
    value: index + 1,
    secondary: "Permanent Founder"
  })),
  topKingdoms: demoOwners.map(([id, name, owned], index) => ({
    id: `${id}-kingdom`,
    name: ["Verdant Crown", "Atlas Dominion", "Aurora Reach", "Sunline Kingdom", "Pixel Republic"][index],
    image: null,
    founderNumber: index + 1,
    kingdomUnlocked: true,
    value: Number(owned),
    secondary: `Kingdom by ${name}`
  })),
  firstBuyers: demoOwners.map(([id, name], index) => ({
    id,
    name,
    image: null,
    founderNumber: index + 1,
    kingdomUnlocked: true,
    value: Date.UTC(2024, 0, index + 1),
    secondary: "Founding buyer"
  })),
  recentPurchases: demoListings.slice(0, 5).map((listing, index) => ({
    id: `demo-purchase-${index}`,
    buyerId: demoOwners[index][0],
    buyerName: demoOwners[index][1],
    buyerImage: null,
    buyerFounderNumber: index + 1,
    buyerKingdomUnlocked: true,
    h3Index: listing.h3Index,
    amountCents: listing.priceCents,
    purchasedAt: new Date(Date.now() - index * 420_000).toISOString(),
    type: index % 2 ? "RESALE_PURCHASE" : "PRIMARY_PURCHASE"
  }))
};
