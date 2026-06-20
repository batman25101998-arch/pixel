import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { adminUserSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot ban your own account." }, { status: 400 });
  }

  const parsed = adminUserSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Administrator accounts cannot be banned here." }, { status: 409 });
  }

  const user = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.user.update({
      where: { id },
      data: {
        bannedAt: parsed.data.banned ? new Date() : null,
        banReason: parsed.data.banned ? parsed.data.reason || "Administrative action" : null
      },
      select: { id: true, displayName: true, founderNumber: true, bannedAt: true, banReason: true }
    });
    await transaction.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: parsed.data.banned ? "USER_BANNED" : "USER_UNBANNED",
        targetType: "user",
        targetId: id,
        metadata: { reason: parsed.data.reason }
      }
    });
    return updated;
  });

  return NextResponse.json({ user });
}
