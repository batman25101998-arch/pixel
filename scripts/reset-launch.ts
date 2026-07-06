import { PrismaClient } from "@prisma/client";

const TOTAL_AVAILABLE_HEXES = 2_016_842;
const REQUIRED_CONFIRMATION = "YES";

async function main() {
  if (process.env.CONFIRM_LAUNCH_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error("Launch reset blocked. Set CONFIRM_LAUNCH_RESET=YES to continue.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Launch reset blocked. DATABASE_URL is not configured in this process.");
  }

  const target = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(target.protocol)) {
    throw new Error("Launch reset blocked. DATABASE_URL must be a PostgreSQL connection string.");
  }
  if (["localhost", "127.0.0.1", "::1"].includes(target.hostname)) {
    throw new Error("Launch reset blocked. DATABASE_URL points to a local database, not production.");
  }

  console.log(`[launch:reset] Database host: ${target.hostname}`);
  console.log(`[launch:reset] Database name: ${target.pathname.replace(/^\//, "")}`);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const authCountsBefore = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.session.count(),
      prisma.verificationToken.count()
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
      const auditLogs = await tx.adminAuditLog.deleteMany();

      await tx.user.updateMany({
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
        auditLogs: auditLogs.count
      };
    }, { maxWait: 10_000, timeout: 300_000 });

    // Every persisted Hex row has a required ownerId. Therefore, deleting all Hex
    // rows is equivalent to COUNT(*) WHERE ownerId IS NOT NULL returning zero.
    const ownedHexes = await prisma.hex.count();
    if (ownedHexes !== 0) {
      throw new Error(`Launch reset verification failed: ${ownedHexes} owned hexes remain.`);
    }

    const authCountsAfter = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.session.count(),
      prisma.verificationToken.count()
    ]);
    if (authCountsBefore.some((count, index) => authCountsAfter[index] < count)) {
      throw new Error("Launch reset verification failed: an authentication table lost records.");
    }

    console.log(`Users kept: ${authCountsAfter[0]}`);
    console.log(`Owned hexes: ${ownedHexes}`);
    console.log(`Available hexes: ${TOTAL_AVAILABLE_HEXES}`);
    console.log(`Transactions deleted: ${deleted.transactions}`);
    console.log(`[launch:reset] Deleted claimed hexes: ${deleted.hexes}`);
    console.log(`[launch:reset] Deleted Stripe/pending payment records: ${deleted.payments}`);
    console.log(`[launch:reset] Deleted marketplace, offer, and trade records: ${deleted.marketplaceListings + deleted.hexOffers + deleted.tradeOffers}`);
    console.log(`[launch:reset] Deleted territories, badges, and audit logs: ${deleted.territories + deleted.badges + deleted.auditLogs}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[launch:reset] Failed.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
