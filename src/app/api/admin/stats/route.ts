import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [users, hexes, territories, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.hex.count(),
    prisma.territory.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.aggregate({ where: { status: "COMPLETED" }, _sum: { amountCents: true } })
  ]);

  return NextResponse.json({
    users,
    hexes,
    territories,
    revenueCents: Number(revenue._sum.amountCents ?? 0)
  });
}
