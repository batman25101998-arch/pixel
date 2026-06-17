import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hexPatchSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hex = await prisma.hex.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, displayName: true, avatarUrl: true } },
      territory: true
    }
  });
  if (!hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
  return NextResponse.json({ hex });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const parsed = hexPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const hex = await prisma.hex.findUnique({ where: { id }, select: { ownerId: true, status: true } });
  if (!hex) return NextResponse.json({ error: "Hex not found." }, { status: 404 });
  if (hex.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextStatus = parsed.data.status;
    const nextPriceCents = parsed.data.priceCents;

    const saved = await tx.hex.update({
      where: { id },
      data: parsed.data,
      include: { owner: { select: { id: true, displayName: true, avatarUrl: true } } }
    });

    if (nextStatus === "FOR_SALE") {
      await tx.marketplace.updateMany({
        where: { hexId: id, status: "ACTIVE" },
        data: { status: "CANCELED" }
      });
      await tx.marketplace.create({
        data: {
          hexId: id,
          sellerId: hex.ownerId,
          priceCents: nextPriceCents ?? Number(saved.priceCents),
          status: "ACTIVE"
        }
      });
    }

    if (nextStatus === "OWNED" && hex.status === "FOR_SALE") {
      await tx.marketplace.updateMany({
        where: { hexId: id, status: "ACTIVE" },
        data: { status: "CANCELED" }
      });
    }

    return saved;
  });

  return NextResponse.json({ hex: updated });
}
