import { prisma } from "@/lib/prisma";

export type RankedOwner = {
  id: string;
  name: string;
  image: string | null;
  founderNumber: number | null;
  kingdomUnlocked: boolean;
  value: number;
  secondary?: string;
};

export type GlobalRankings = {
  largestTerritories: RankedOwner[];
  mostOwnedHexes: RankedOwner[];
  highestValue: RankedOwner[];
  mostCountries: RankedOwner[];
  mostSettlements: RankedOwner[];
  newestOwners: RankedOwner[];
  firstBuyers: RankedOwner[];
  recentPurchases: Array<{
    id: string;
    buyerId: string;
    buyerName: string;
    buyerImage: string | null;
    buyerFounderNumber: number | null;
    buyerKingdomUnlocked: boolean;
    h3Index: string;
    amountCents: number;
    purchasedAt: string;
    type: string;
  }>;
};

const emptyRankings: GlobalRankings = {
  largestTerritories: [],
  mostOwnedHexes: [],
  highestValue: [],
  mostCountries: [],
  mostSettlements: [],
  newestOwners: [],
  firstBuyers: [],
  recentPurchases: []
};

type CountryAggregate = {
  ownerId: string;
  countryCount: bigint;
};

export async function getGlobalRankings(limit = 10): Promise<GlobalRankings> {
  const take = Math.min(Math.max(Math.floor(limit), 1), 50);

  try {
    const [territories, owners, values, countries, firstBuyerGroups, purchases, settlementOwners, newestOwners] = await Promise.all([
      prisma.territory.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ hexCount: "desc" }, { createdAt: "asc" }],
        take,
        include: { owner: { select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
      }),
      prisma.user.findMany({
        where: { ownedHexes: { some: {} } },
        orderBy: { ownedHexes: { _count: "desc" } },
        take,
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          founderNumber: true,
          kingdomUnlockedAt: true,
          _count: { select: { ownedHexes: true } }
        }
      }),
      prisma.hex.groupBy({
        by: ["ownerId"],
        _sum: { priceCents: true },
        _count: { _all: true },
        orderBy: { _sum: { priceCents: "desc" } },
        take
      }),
      prisma.$queryRaw<CountryAggregate[]>`
        SELECT owner_id AS "ownerId", COUNT(DISTINCT country_code)::bigint AS "countryCount"
        FROM hexes
        WHERE country_code IS NOT NULL
        GROUP BY owner_id
        ORDER BY "countryCount" DESC, owner_id ASC
        LIMIT ${take}
      `,
      prisma.transaction.groupBy({
        by: ["buyerId"],
        where: { status: "COMPLETED", type: "PRIMARY_PURCHASE", completedAt: { not: null } },
        _min: { completedAt: true },
        orderBy: { _min: { completedAt: "asc" } },
        take
      }),
      prisma.transaction.findMany({
        where: {
          status: "COMPLETED",
          type: { in: ["PRIMARY_PURCHASE", "RESALE_PURCHASE"] },
          completedAt: { not: null }
        },
        orderBy: { completedAt: "desc" },
        take,
        include: {
          buyer: { select: { displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } },
          hex: { select: { h3Index: true } }
        }
      }),
      prisma.user.findMany({
        where: { territories: { some: { status: "ACTIVE" } } },
        orderBy: { territories: { _count: "desc" } },
        take,
        select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true, _count: { select: { territories: true } } }
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take,
        select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true, createdAt: true }
      })
    ]);

    const aggregateOwnerIds = new Set([
      ...values.map((entry) => entry.ownerId),
      ...countries.map((entry) => entry.ownerId),
      ...firstBuyerGroups.map((entry) => entry.buyerId)
    ]);
    const aggregateOwners = await prisma.user.findMany({
      where: { id: { in: Array.from(aggregateOwnerIds) } },
      select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true }
    });
    const ownerById = new Map(aggregateOwners.map((owner) => [owner.id, owner]));

    return {
      largestTerritories: territories.map((territory) => ({
        id: territory.id,
        name: territory.name,
        image: territory.owner.avatarUrl,
        founderNumber: territory.owner.founderNumber,
        kingdomUnlocked: Boolean(territory.owner.kingdomUnlockedAt),
        value: territory.hexCount,
        secondary: `${territory.flag} ${territory.owner.displayName}`
      })),
      mostOwnedHexes: owners.map((owner) => ({
        id: owner.id,
        name: owner.displayName,
        image: owner.avatarUrl,
        founderNumber: owner.founderNumber,
        kingdomUnlocked: Boolean(owner.kingdomUnlockedAt),
        value: owner._count.ownedHexes
      })),
      highestValue: values.flatMap((entry) => {
        const owner = ownerById.get(entry.ownerId);
        return owner
          ? [{
              id: owner.id,
              name: owner.displayName,
              image: owner.avatarUrl,
              founderNumber: owner.founderNumber,
              kingdomUnlocked: Boolean(owner.kingdomUnlockedAt),
              value: Number(entry._sum.priceCents ?? 0),
              secondary: `${entry._count._all.toLocaleString()} hexes`
            }]
          : [];
      }),
      mostCountries: countries.flatMap((entry) => {
        const owner = ownerById.get(entry.ownerId);
        return owner
          ? [{
              id: owner.id,
              name: owner.displayName,
              image: owner.avatarUrl,
              founderNumber: owner.founderNumber,
              kingdomUnlocked: Boolean(owner.kingdomUnlockedAt),
              value: Number(entry.countryCount)
            }]
          : [];
      }),
      mostSettlements: settlementOwners.map((owner) => ({
        id: owner.id,
        name: owner.displayName,
        image: owner.avatarUrl,
        founderNumber: owner.founderNumber,
        kingdomUnlocked: Boolean(owner.kingdomUnlockedAt),
        value: owner._count.territories,
        secondary: "Villages, cities, and kingdoms"
      })),
      newestOwners: newestOwners.map((owner) => ({
        id: owner.id,
        name: owner.displayName,
        image: owner.avatarUrl,
        founderNumber: owner.founderNumber,
        kingdomUnlocked: Boolean(owner.kingdomUnlockedAt),
        value: owner.createdAt.getTime(),
        secondary: "New owner"
      })),
      firstBuyers: firstBuyerGroups.flatMap((entry) => {
        const owner = ownerById.get(entry.buyerId);
        return owner && entry._min.completedAt
          ? [{
              id: owner.id,
              name: owner.displayName,
              image: owner.avatarUrl,
              founderNumber: owner.founderNumber,
              kingdomUnlocked: Boolean(owner.kingdomUnlockedAt),
              value: entry._min.completedAt.getTime(),
              secondary: "Founding buyer"
            }]
          : [];
      }),
      recentPurchases: purchases.map((purchase) => ({
        id: purchase.id,
        buyerId: purchase.buyerId,
        buyerName: purchase.buyer.displayName,
        buyerImage: purchase.buyer.avatarUrl,
        buyerFounderNumber: purchase.buyer.founderNumber,
        buyerKingdomUnlocked: Boolean(purchase.buyer.kingdomUnlockedAt),
        h3Index: purchase.hex.h3Index,
        amountCents: Number(purchase.amount),
        purchasedAt: (purchase.completedAt ?? purchase.createdAt).toISOString(),
        type: purchase.type
      }))
    };
  } catch (error) {
    console.error("Global rankings could not be loaded", error);
    return emptyRankings;
  }
}
