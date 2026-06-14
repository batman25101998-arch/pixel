import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { areContiguous, slugifyTerritoryName } from "@/lib/territory";
import { territorySchema } from "@/lib/validators";

export async function GET() {
  const territories = await prisma.territory.findMany({
    where: { status: "ACTIVE" },
    take: 50,
    orderBy: { hexes: { _count: "desc" } },
    include: {
      owner: { select: { displayName: true } },
      _count: { select: { hexes: true } }
    }
  });
  return NextResponse.json({ territories });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = territorySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const hexes = await prisma.hex.findMany({
    where: {
      id: { in: parsed.data.hexIds },
      ownerId: session.user.id
    },
    select: { id: true, h3Index: true }
  });

  if (hexes.length !== parsed.data.hexIds.length) {
    return NextResponse.json({ error: "Every selected hex must belong to you." }, { status: 400 });
  }
  if (!areContiguous(hexes.map((hex) => hex.h3Index))) {
    return NextResponse.json({ error: "Territories must be made from adjacent hexes." }, { status: 400 });
  }

  const territory = await prisma.territory.create({
    data: {
      ownerId: session.user.id,
      name: parsed.data.name,
      slug: slugifyTerritoryName(parsed.data.name),
      description: parsed.data.description,
      color: parsed.data.color,
      hexes: { connect: hexes.map((hex) => ({ id: hex.id })) },
      hexCount: hexes.length
    },
    include: { hexes: true }
  });

  return NextResponse.json({ territory }, { status: 201 });
}
