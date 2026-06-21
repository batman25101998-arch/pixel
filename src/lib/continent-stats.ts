import { prisma } from "@/lib/prisma";

export type ContinentStat = {
  name: string;
  ownedHexes: number;
  ownershipPercent: number;
};

const continents = [
  { name: "Europe", codes: ["GB", "FR", "ES", "DE", "IT", "PL", "UA"], capacity: 70_000 },
  { name: "North America", codes: ["US", "CA", "MX"], capacity: 125_000 },
  { name: "Asia", codes: ["IN", "CN", "JP", "ID", "RU"], capacity: 210_000 },
  { name: "South America", codes: ["BR", "AR"], capacity: 90_000 },
  { name: "Africa", codes: ["ZA", "EG", "NG"], capacity: 120_000 },
  { name: "Oceania", codes: ["AU"], capacity: 45_000 }
] as const;

export const demoContinentStats: ContinentStat[] = [
  ["Europe", 21_980, 31.4],
  ["North America", 35_875, 28.7],
  ["Asia", 49_350, 23.5],
  ["South America", 16_920, 18.8],
  ["Africa", 16_440, 13.7],
  ["Oceania", 5_805, 12.9]
].map(([name, ownedHexes, ownershipPercent]) => ({
  name: String(name),
  ownedHexes: Number(ownedHexes),
  ownershipPercent: Number(ownershipPercent)
}));

export async function getContinentStats(): Promise<ContinentStat[]> {
  try {
    const grouped = await prisma.hex.groupBy({
      by: ["countryCode"],
      where: { countryCode: { not: null } },
      _count: { _all: true }
    });
    const countByCode = new Map(grouped.map((entry) => [entry.countryCode, entry._count._all]));

    return continents.map((continent) => {
      const ownedHexes = continent.codes.reduce((sum, code) => sum + (countByCode.get(code) ?? 0), 0);
      return {
        name: continent.name,
        ownedHexes,
        ownershipPercent: Math.min(100, (ownedHexes / continent.capacity) * 100)
      };
    });
  } catch (error) {
    console.error("Continent ownership statistics could not be loaded", error);
    return continents.map((continent) => ({ name: continent.name, ownedHexes: 0, ownershipPercent: 0 }));
  }
}
