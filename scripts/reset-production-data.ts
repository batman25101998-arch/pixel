import { createHash } from "node:crypto";
import { HexStatus, PrismaClient } from "@prisma/client";

const REQUIRED_CONFIRMATION = "YES";

function productionDatabaseTarget(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error("Reset blocked. DATABASE_URL must be a PostgreSQL connection string.");
  }
  if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Reset blocked. DATABASE_URL points to a local database, not production.");
  }

  return {
    host: parsed.hostname,
    database: parsed.pathname.replace(/^\//, ""),
    fingerprint: createHash("sha256").update(databaseUrl).digest("hex").slice(0, 12)
  };
}

async function main() {
  if (process.env.CONFIRM_PRODUCTION_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error("Reset blocked. Set CONFIRM_PRODUCTION_RESET=YES to confirm the production data reset.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Reset blocked. DATABASE_URL is not configured in this process.");
  }
  if (process.env.DEMO_MODE === "true") {
    throw new Error("Reset blocked. DEMO_MODE must be disabled for a production reset.");
  }

  const target = productionDatabaseTarget(databaseUrl);
  console.log(`[reset:production-data] Production DATABASE_URL host: ${target.host}`);
  console.log(`[reset:production-data] Production database: ${target.database}`);
  console.log(`[reset:production-data] DATABASE_URL fingerprint: ${target.fingerprint}`);
  console.log("[reset:production-data] Confirmation accepted. Starting reset...");

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const [usersBefore, accountsBefore, sessionsBefore] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.session.count()
    ]);

    const deleted = await prisma.$transaction(async (tx) => {
      const hexOffers = await tx.hexOffer.deleteMany();
      const tradeOffers = await tx.hexTradeOffer.deleteMany();
      const transactions = await tx.transaction.deleteMany();
      const marketplaceListings = await tx.marketplaceListing.deleteMany();
      const payments = await tx.payment.deleteMany();
      const badges = await tx.badge.deleteMany();

      // Hex rows represent claims. Available resolution-5 cells are generated virtually,
      // so deleting every Hex row is the schema-safe equivalent of resetting ownership.
      const hexes = await tx.hex.deleteMany();
      const territories = await tx.territory.deleteMany();

      const resetUsers = await tx.user.updateMany({
        where: {
          OR: [
            { founderNumber: { not: null } },
            { kingdomUnlockedAt: { not: null } }
          ]
        },
        data: {
          founderNumber: null,
          kingdomUnlockedAt: null
        }
      });

      return {
        hexOffers: hexOffers.count,
        tradeOffers: tradeOffers.count,
        transactions: transactions.count,
        marketplaceListings: marketplaceListings.count,
        payments: payments.count,
        badges: badges.count,
        hexes: hexes.count,
        territories: territories.count,
        resetUsers: resetUsers.count
      };
    }, { maxWait: 10_000, timeout: 300_000 });

    const [ownedHexCount, claimedHexCount, usersAfter, accountsAfter, sessionsAfter] = await Promise.all([
      prisma.hex.count(),
      prisma.hex.count({ where: { status: { not: HexStatus.AVAILABLE } } }),
      prisma.user.count(),
      prisma.account.count(),
      prisma.session.count()
    ]);

    if (ownedHexCount !== 0) {
      throw new Error(`Reset verification failed: ownedHexCount must be 0, found ${ownedHexCount}.`);
    }
    if (claimedHexCount !== 0) {
      throw new Error(`Reset verification failed: claimedHexCount must be 0, found ${claimedHexCount}.`);
    }
    if (usersAfter !== usersBefore || accountsAfter !== accountsBefore || sessionsAfter !== sessionsBefore) {
      throw new Error("Reset verification failed: user or authentication record counts changed.");
    }

    console.log("[reset:production-data] Reset complete.");
    console.log(`  deleted hexes: ${deleted.hexes}`);
    console.log(`  deleted transactions: ${deleted.transactions}`);
    console.log(`  deleted payments/pending purchases: ${deleted.payments}`);
    console.log(`  deleted marketplace listings: ${deleted.marketplaceListings}`);
    console.log(`  deleted offers/trades: ${deleted.hexOffers + deleted.tradeOffers}`);
    console.log(`  deleted territories: ${deleted.territories}`);
    console.log(`  deleted badges: ${deleted.badges}`);
    console.log(`  cleared founder/kingdom fields: ${deleted.resetUsers}`);
    console.log(`  users kept: ${usersAfter}`);
    console.log(`  auth accounts kept: ${accountsAfter}`);
    console.log(`  sessions kept: ${sessionsAfter}`);
    console.log(`  ownedHexCount = ${ownedHexCount}`);
    console.log(`  claimedHexCount = ${claimedHexCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[reset:production-data] Reset failed.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
