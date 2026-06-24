import { BadgeType, PrismaClient } from "@prisma/client";
import { cellToLatLng, gridDisk, gridRingUnsafe, latLngToCell } from "h3-js";

const TARGET_EMAIL = "batman25101998@gmail.com";
const H3_RESOLUTION = 5;
const TARGET_HEX_COUNT = 1000;
const BATCH_SIZE = 100;
const ZAGREB = {
  lat: 45.815,
  lng: 15.981
};

const prisma = new PrismaClient();

type GeneratedCell = {
  h3Index: string;
  latitude: number;
  longitude: number;
  q: number;
  r: number;
};

function log(message: string) {
  console.log(`[grant:kingdom] ${message}`);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function generateConnectedZagrebCells(): GeneratedCell[] {
  log("Generating connected H3 cells around Zagreb");

  const center = latLngToCell(ZAGREB.lat, ZAGREB.lng, H3_RESOLUTION);
  const innerDisk = gridDisk(center, 17);
  const outerRing = gridRingUnsafe(center, 18);
  const indexes = [...innerDisk, ...outerRing].slice(0, TARGET_HEX_COUNT);
  const uniqueIndexes = Array.from(new Set(indexes));

  if (uniqueIndexes.length !== TARGET_HEX_COUNT) {
    throw new Error(`Expected ${TARGET_HEX_COUNT} unique H3 cells, generated ${uniqueIndexes.length}.`);
  }

  return uniqueIndexes.map((h3Index) => {
    const [latitude, longitude] = cellToLatLng(h3Index);

    return {
      h3Index,
      latitude,
      longitude,
      q: Math.round((longitude + 180) * 10000),
      r: Math.round((latitude + 90) * 10000)
    };
  });
}

async function main() {
  log("Script started");
  log(`DATABASE_URL exists: ${process.env.DATABASE_URL ? "yes" : "no"}`);

  if (!process.env.DATABASE_URL) {
    console.error("[grant:kingdom] ERROR: DATABASE_URL is missing. Add DATABASE_URL to your environment and run again.");
    process.exitCode = 1;
    return;
  }

  log("Connecting to Prisma");
  await prisma.$connect();

  log(`Finding user by email: ${TARGET_EMAIL}`);
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    select: { id: true, email: true }
  });

  if (!user) {
    console.error(`[grant:kingdom] ERROR: User not found: ${TARGET_EMAIL}`);
    process.exitCode = 1;
    return;
  }

  log(`User found: ${user.id}`);

  const cells = generateConnectedZagrebCells();
  const batches = chunk(cells, BATCH_SIZE);
  const now = new Date();
  let createdHexCount = 0;
  let updatedHexCount = 0;

  log(`Generated cells count: ${cells.length}`);
  log(`Writing hexes in ${batches.length} batches of ${BATCH_SIZE}`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchNumber = batchIndex + 1;
    const batchIndexes = batch.map((cell) => cell.h3Index);

    log(`Batch ${batchNumber}/${batches.length}: creating missing hexes`);
    const createResult = await prisma.hex.createMany({
      data: batch.map((cell) => ({
        h3Index: cell.h3Index,
        resolution: H3_RESOLUTION,
        q: cell.q,
        r: cell.r,
        latitude: cell.latitude,
        longitude: cell.longitude,
        ownerId: user.id,
        status: "OWNED",
        priceCents: BigInt(100),
        purchaseDate: now
      })),
      skipDuplicates: true
    });

    createdHexCount += createResult.count;

    log(`Batch ${batchNumber}/${batches.length}: assigning ownership`);
    const updateResult = await prisma.hex.updateMany({
      where: {
        h3Index: { in: batchIndexes }
      },
      data: {
        ownerId: user.id,
        territoryId: null,
        status: "OWNED",
        priceCents: BigInt(100),
        purchaseDate: now
      }
    });

    updatedHexCount += updateResult.count;
    log(
      `Batch ${batchNumber}/${batches.length} done: created ${createResult.count}, updated ${updateResult.count}, progress ${
        Math.min(batchNumber * BATCH_SIZE, cells.length)
      }/${cells.length}`
    );
  }

  log("Unlocking kingdom status");
  await prisma.user.update({
    where: { id: user.id },
    data: { kingdomUnlockedAt: now }
  });

  log("Writing badges");
  const badgeTypes = [
    BadgeType.FIRST_HEX,
    BadgeType.VILLAGE_OWNER,
    BadgeType.CITY_BUILDER,
    BadgeType.KINGDOM_FOUNDER,
    BadgeType.COLLECTOR_100
  ];

  for (const type of badgeTypes) {
    await prisma.badge.upsert({
      where: { userId_type: { userId: user.id, type } },
      create: { userId: user.id, type },
      update: {}
    });
  }

  const finalOwnedHexCount = await prisma.hex.count({
    where: { ownerId: user.id }
  });

  log("Done");
  console.log(
    JSON.stringify(
      {
        userId: user.id,
        generatedCellsCount: cells.length,
        createdHexCount,
        updatedHexCount,
        createdOrUpdatedHexCount: updatedHexCount,
        finalOwnedHexCount
      },
      null,
      2
    )
  );
}

async function run() {
  try {
    await main();
  } catch (error) {
    console.error("[grant:kingdom] ERROR: Script failed");
    console.error(error);
    process.exitCode = 1;
  } finally {
    log("Disconnecting Prisma");
    await prisma.$disconnect();
  }
}

void run();
