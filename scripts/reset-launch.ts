import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

const REQUIRED_CONFIRMATION = "YES";

loadEnvConfig(process.cwd());

type ColumnInfo = {
  column_name: string;
  is_nullable: "YES" | "NO";
};

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function tableExists(prisma: PrismaClient, tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS "exists"
  `;

  return rows[0]?.exists === true;
}

async function tableColumns(prisma: PrismaClient, tableName: string) {
  const rows = await prisma.$queryRaw<ColumnInfo[]>`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;

  return new Map(rows.map((row) => [row.column_name, row]));
}

async function deleteIfTableExists(prisma: PrismaClient, tableName: string) {
  if (!(await tableExists(prisma, tableName))) {
    console.log(`[launch:reset] Skipped missing table: ${tableName}`);
    return 0;
  }

  const deleted = await prisma.$executeRawUnsafe(`DELETE FROM ${quoteIdentifier(tableName)}`);
  console.log(`[launch:reset] Deleted ${deleted} rows from ${tableName}`);
  return deleted;
}

async function resetHexes(prisma: PrismaClient) {
  if (!(await tableExists(prisma, "hexes"))) {
    console.log("[launch:reset] Skipped missing table: hexes");
    return { reset: 0, deleted: 0 };
  }

  const columns = await tableColumns(prisma, "hexes");
  const ownerColumn = columns.get("owner_id");

  if (!ownerColumn) {
    console.log("[launch:reset] hexes.owner_id is missing; deleting persisted hex rows.");
    const deleted = await prisma.$executeRawUnsafe(`DELETE FROM ${quoteIdentifier("hexes")}`);
    return { reset: 0, deleted };
  }

  if (ownerColumn.is_nullable === "NO") {
    console.log("[launch:reset] hexes.owner_id is NOT NULL; deleting persisted claimed hex rows so virtual hexes become available.");
    const deleted = await prisma.$executeRawUnsafe(`DELETE FROM ${quoteIdentifier("hexes")}`);
    return { reset: 0, deleted };
  }

  const assignments: string[] = ['"owner_id" = NULL'];

  if (columns.has("status")) assignments.push('"status" = \'AVAILABLE\'');
  if (columns.has("image_url")) assignments.push('"image_url" = NULL');
  if (columns.has("avatar_url")) assignments.push('"avatar_url" = NULL');
  if (columns.has("title")) assignments.push('"title" = NULL');
  if (columns.has("message")) assignments.push('"message" = NULL');
  if (columns.has("external_link")) assignments.push('"external_link" = NULL');
  if (columns.has("link")) assignments.push('"link" = NULL');
  if (columns.has("purchased_at")) assignments.push('"purchased_at" = NULL');
  if (columns.has("purchase_date")) assignments.push('"purchase_date" = NULL');
  if (columns.has("price_cents")) assignments.push('"price_cents" = 100');
  if (columns.has("territory_id")) assignments.push('"territory_id" = NULL');
  if (columns.has("updated_at")) assignments.push('"updated_at" = now()');

  const reset = await prisma.$executeRawUnsafe(`UPDATE ${quoteIdentifier("hexes")} SET ${assignments.join(", ")}`);
  return { reset, deleted: 0 };
}

async function ownedHexCount(prisma: PrismaClient) {
  if (!(await tableExists(prisma, "hexes"))) return 0;

  const columns = await tableColumns(prisma, "hexes");
  const checks: string[] = [];

  if (columns.has("owner_id")) checks.push('"owner_id" IS NOT NULL');
  if (columns.has("status")) checks.push('"status" <> \'AVAILABLE\'');

  if (checks.length === 0) return 0;

  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier("hexes")} WHERE ${checks.join(" OR ")}`
  );

  return Number(rows[0]?.count ?? 0);
}

async function main() {
  if (process.env.CONFIRM_LAUNCH_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error("Launch reset blocked. Set CONFIRM_LAUNCH_RESET=YES to continue.");
  }

  if (process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    throw new Error("Launch reset blocked. Disable DEMO_MODE and NEXT_PUBLIC_DEMO_MODE first.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Launch reset blocked. DATABASE_URL is not configured.");
  }

  const target = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(target.protocol)) {
    throw new Error("Launch reset blocked. DATABASE_URL must be a PostgreSQL connection string.");
  }
  if (["localhost", "127.0.0.1", "::1"].includes(target.hostname)) {
    throw new Error("Launch reset blocked. DATABASE_URL points to a local database.");
  }

  console.log(`[launch:reset] Database host: ${target.hostname}`);
  console.log(`[launch:reset] Database name: ${target.pathname.replace(/^\//, "")}`);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const usersKept = await tableExists(prisma, "users")
      ? Number((await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM users`)[0]?.count ?? 0)
      : 0;

    const transactionsDeleted = await deleteIfTableExists(prisma, "transactions");
    const paymentsDeleted = await deleteIfTableExists(prisma, "payments");
    const hexReset = await resetHexes(prisma);
    const ownedAfter = await ownedHexCount(prisma);

    console.log(`Users kept: ${usersKept}`);
    console.log(`Hex rows reset: ${hexReset.reset}`);
    console.log(`Hex rows deleted: ${hexReset.deleted}`);
    console.log(`Transactions deleted: ${transactionsDeleted}`);
    console.log(`Checkout/payment records deleted: ${paymentsDeleted}`);
    console.log(`Owned hexes after reset: ${ownedAfter}`);

    if (ownedAfter !== 0) {
      throw new Error(`Launch reset verification failed: owned hexes = ${ownedAfter}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[launch:reset] Failed.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
