import { PrismaClient } from "@prisma/client";

const REQUIRED_CONFIRMATION = "YES";

async function main() {
  if (process.env.CONFIRM_PRODUCTION_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error("Reset blocked. Set CONFIRM_PRODUCTION_RESET=YES to confirm the production data reset.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Reset blocked. DATABASE_URL is not configured.");
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);
  console.log(`[reset:production-data] Target: ${databaseUrl.hostname}/${databaseUrl.pathname.replace(/^\//, "")}`);
  console.log("[reset:production-data] Confirmation accepted. Starting app-data reset...");

  const prisma = new PrismaClient();
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

    const [finalOwnedHexCount, usersAfter, accountsAfter, sessionsAfter] = await Promise.all([
      prisma.hex.count(),
      prisma.user.count(),
      prisma.account.count(),
      prisma.session.count()
    ]);

    if (finalOwnedHexCount !== 0) throw new Error(`Reset verification failed: ${finalOwnedHexCount} owned hexes remain.`);
    if (usersAfter !== usersBefore || accountsAfter !== accountsBefore || sessionsAfter !== sessionsBefore) {
      throw new Error("Reset verification failed: user or authentication records changed.");
    }

    console.log("[reset:production-data] Reset complete.");
    console.log(`  deleted hexes: ${deleted.hexes}`);
    console.log(`  deleted transactions: ${deleted.transactions}`);
    console.log(`  deleted payments: ${deleted.payments}`);
    console.log(`  deleted marketplace listings: ${deleted.marketplaceListings}`);
    console.log(`  deleted offers: ${deleted.hexOffers + deleted.tradeOffers}`);
    console.log(`  deleted territories: ${deleted.territories}`);
    console.log(`  deleted badges: ${deleted.badges}`);
    console.log(`  cleared founder/kingdom fields: ${deleted.resetUsers}`);
    console.log(`  users kept: ${usersAfter}`);
    console.log(`  auth accounts kept: ${accountsAfter}`);
    console.log(`  sessions kept: ${sessionsAfter}`);
    console.log(`  final owned hex count = ${finalOwnedHexCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[reset:production-data] Reset failed.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
