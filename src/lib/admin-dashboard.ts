import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminDashboardData = {
  metrics: {
    users: number;
    bannedUsers: number;
    hexes: number;
    territories: number;
    transactions: number;
    grossRevenueCents: number;
    platformFeesCents: number;
    refundedCents: number;
  };
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    founderNumber: number | null;
    kingdomUnlocked: boolean;
    role: string;
    bannedAt: string | null;
    banReason: string | null;
    ownedHexes: number;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    userName: string;
    userEmail: string;
    userFounderNumber: number | null;
    userKingdomUnlocked: boolean;
    status: string;
    amountCents: number;
    providerPaymentIntent: string | null;
    createdAt: string;
  }>;
  images: Array<{
    targetType: "user" | "hex";
    targetId: string;
    field: "avatarUrl" | "imageUrl";
    url: string;
    ownerName: string;
    ownerFounderNumber: number | null;
    ownerKingdomUnlocked: boolean;
    label: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    status: string;
    amountCents: number;
    buyerName: string;
    buyerEmail: string;
    buyerFounderNumber: number | null;
    buyerKingdomUnlocked: boolean;
    sellerName: string | null;
    sellerFounderNumber: number | null;
    sellerKingdomUnlocked: boolean;
    h3Index: string;
    createdAt: string;
  }>;
  sales: Array<{ day: string; count: number; revenueCents: number }>;
  heatmap: Array<{ latitude: number; longitude: number; count: number; valueCents: number }>;
  auditLog: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    adminName: string;
    adminFounderNumber: number | null;
    adminKingdomUnlocked: boolean;
    createdAt: string;
  }>;
};

const emptyDashboard: AdminDashboardData = {
  metrics: {
    users: 0,
    bannedUsers: 0,
    hexes: 0,
    territories: 0,
    transactions: 0,
    grossRevenueCents: 0,
    platformFeesCents: 0,
    refundedCents: 0
  },
  users: [],
  payments: [],
  images: [],
  transactions: [],
  sales: [],
  heatmap: [],
  auditLog: []
};

type SalesRow = { day: Date; count: bigint; revenueCents: bigint };
type HeatRow = { latitude: Prisma.Decimal; longitude: Prisma.Decimal; count: bigint; valueCents: bigint };

function salesTimeline(rows: SalesRow[]) {
  const byDay = new Map(rows.map((row) => [row.day.toISOString().slice(0, 10), row]));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (29 - index));
    const row = byDay.get(day.toISOString().slice(0, 10));
    return {
      day: day.toISOString(),
      count: Number(row?.count ?? 0),
      revenueCents: Number(row?.revenueCents ?? 0)
    };
  });
}

function transactionSearch(query: string): Prisma.TransactionWhereInput {
  if (!query) return {};
  const contains = query.slice(0, 100);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contains);

  return {
    OR: [
      ...(uuid ? [{ id: contains }, { paymentId: contains }] : []),
      { hex: { is: { h3Index: { contains, mode: "insensitive" } } } },
      { buyer: { is: { email: { contains, mode: "insensitive" } } } },
      { buyer: { is: { displayName: { contains, mode: "insensitive" } } } },
      { seller: { is: { email: { contains, mode: "insensitive" } } } },
      { seller: { is: { displayName: { contains, mode: "insensitive" } } } }
    ]
  };
}

export async function getAdminDashboardData(query = ""): Promise<AdminDashboardData> {
  try {
    const [
      userCount,
      bannedUsers,
      hexCount,
      territoryCount,
      transactionAggregate,
      refundedAggregate,
      users,
      payments,
      hexImages,
      userImages,
      transactions,
      sales,
      heatmap,
      auditLog
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { bannedAt: { not: null } } }),
      prisma.hex.count(),
      prisma.territory.count({ where: { status: "ACTIVE" } }),
      prisma.transaction.aggregate({
        where: { status: "COMPLETED" },
        _count: true,
        _sum: { amountCents: true, platformFeeCents: true }
      }),
      prisma.payment.aggregate({ where: { status: "REFUNDED" }, _sum: { amountCents: true } }),
      prisma.user.findMany({
        orderBy: [{ bannedAt: "desc" }, { createdAt: "desc" }],
        take: 25,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          founderNumber: true,
          kingdomUnlockedAt: true,
          role: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
          _count: { select: { ownedHexes: true } }
        }
      }),
      prisma.payment.findMany({
        where: { status: { in: ["SUCCEEDED", "REFUNDED"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { displayName: true, email: true, founderNumber: true, kingdomUnlockedAt: true } } }
      }),
      prisma.hex.findMany({
        where: { OR: [{ imageUrl: { not: null } }, { avatarUrl: { not: null } }] },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          h3Index: true,
          imageUrl: true,
          avatarUrl: true,
          owner: { select: { displayName: true, founderNumber: true, kingdomUnlockedAt: true } }
        }
      }),
      prisma.user.findMany({
        where: { avatarUrl: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true }
      }),
      prisma.transaction.findMany({
        where: transactionSearch(query.trim()),
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          buyer: { select: { displayName: true, email: true, founderNumber: true, kingdomUnlockedAt: true } },
          seller: { select: { displayName: true, founderNumber: true, kingdomUnlockedAt: true } },
          hex: { select: { h3Index: true } }
        }
      }),
      prisma.$queryRaw<SalesRow[]>`
        SELECT
          date_trunc('day', completed_at) AS day,
          COUNT(*)::bigint AS count,
          COALESCE(SUM(amount_cents), 0)::bigint AS "revenueCents"
        FROM transactions
        WHERE status = 'COMPLETED'::transaction_status
          AND completed_at >= now() - interval '29 days'
        GROUP BY date_trunc('day', completed_at)
        ORDER BY day ASC
      `,
      prisma.$queryRaw<HeatRow[]>`
        SELECT
          ROUND(latitude / 5) * 5 AS latitude,
          ROUND(longitude / 5) * 5 AS longitude,
          COUNT(*)::bigint AS count,
          COALESCE(SUM(price_cents), 0)::bigint AS "valueCents"
        FROM hexes
        GROUP BY ROUND(latitude / 5), ROUND(longitude / 5)
        ORDER BY count DESC
        LIMIT 400
      `,
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { admin: { select: { displayName: true, founderNumber: true, kingdomUnlockedAt: true } } }
      })
    ]);

    return {
      metrics: {
        users: userCount,
        bannedUsers,
        hexes: hexCount,
        territories: territoryCount,
        transactions: transactionAggregate._count,
        grossRevenueCents: Number(transactionAggregate._sum.amountCents ?? 0),
        platformFeesCents: Number(transactionAggregate._sum.platformFeeCents ?? 0),
        refundedCents: Number(refundedAggregate._sum.amountCents ?? 0)
      },
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        founderNumber: user.founderNumber,
        kingdomUnlocked: Boolean(user.kingdomUnlockedAt),
        role: user.role,
        bannedAt: user.bannedAt?.toISOString() ?? null,
        banReason: user.banReason,
        ownedHexes: user._count.ownedHexes,
        createdAt: user.createdAt.toISOString()
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        userName: payment.user.displayName,
        userEmail: payment.user.email,
        userFounderNumber: payment.user.founderNumber,
        userKingdomUnlocked: Boolean(payment.user.kingdomUnlockedAt),
        status: payment.status,
        amountCents: Number(payment.amountCents),
        providerPaymentIntent: payment.providerPaymentIntent,
        createdAt: payment.createdAt.toISOString()
      })),
      images: [
        ...hexImages.flatMap((hex) => [
          ...(hex.imageUrl ? [{
            targetType: "hex" as const,
            targetId: hex.id,
            field: "imageUrl" as const,
            url: hex.imageUrl,
            ownerName: hex.owner.displayName,
            ownerFounderNumber: hex.owner.founderNumber,
            ownerKingdomUnlocked: Boolean(hex.owner.kingdomUnlockedAt),
            label: hex.h3Index
          }] : []),
          ...(hex.avatarUrl ? [{
            targetType: "hex" as const,
            targetId: hex.id,
            field: "avatarUrl" as const,
            url: hex.avatarUrl,
            ownerName: hex.owner.displayName,
            ownerFounderNumber: hex.owner.founderNumber,
            ownerKingdomUnlocked: Boolean(hex.owner.kingdomUnlockedAt),
            label: hex.h3Index
          }] : [])
        ]),
        ...userImages.flatMap((user) => user.avatarUrl ? [{
          targetType: "user" as const,
          targetId: user.id,
          field: "avatarUrl" as const,
          url: user.avatarUrl,
          ownerName: user.displayName,
          ownerFounderNumber: user.founderNumber,
          ownerKingdomUnlocked: Boolean(user.kingdomUnlockedAt),
          label: "Profile avatar"
        }] : [])
      ].slice(0, 30),
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        status: transaction.status,
        amountCents: Number(transaction.amountCents),
        buyerName: transaction.buyer.displayName,
        buyerEmail: transaction.buyer.email,
        buyerFounderNumber: transaction.buyer.founderNumber,
        buyerKingdomUnlocked: Boolean(transaction.buyer.kingdomUnlockedAt),
        sellerName: transaction.seller?.displayName ?? null,
        sellerFounderNumber: transaction.seller?.founderNumber ?? null,
        sellerKingdomUnlocked: Boolean(transaction.seller?.kingdomUnlockedAt),
        h3Index: transaction.hex.h3Index,
        createdAt: transaction.createdAt.toISOString()
      })),
      sales: salesTimeline(sales),
      heatmap: heatmap.map((row) => ({
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        count: Number(row.count),
        valueCents: Number(row.valueCents)
      })),
      auditLog: auditLog.map((entry) => ({
        id: entry.id,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        adminName: entry.admin.displayName,
        adminFounderNumber: entry.admin.founderNumber,
        adminKingdomUnlocked: Boolean(entry.admin.kingdomUnlockedAt),
        createdAt: entry.createdAt.toISOString()
      }))
    };
  } catch (error) {
    console.error("Admin dashboard data could not be loaded", error);
    return emptyDashboard;
  }
}
