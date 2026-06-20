import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteManagedObject } from "@/lib/storage";
import { adminImageSchema } from "@/lib/validators";

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const parsed = adminImageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { targetType, targetId, field } = parsed.data;
  let imageUrl: string | null = null;

  await prisma.$transaction(async (transaction) => {
    if (targetType === "user") {
      const user = await transaction.user.findUnique({ where: { id: targetId }, select: { avatarUrl: true } });
      if (!user) throw new Error("IMAGE_TARGET_NOT_FOUND");
      imageUrl = user.avatarUrl;
      await transaction.user.update({ where: { id: targetId }, data: { avatarUrl: null } });
    } else {
      const hex = await transaction.hex.findUnique({
        where: { id: targetId },
        select: { avatarUrl: true, imageUrl: true }
      });
      if (!hex) throw new Error("IMAGE_TARGET_NOT_FOUND");
      imageUrl = hex[field];
      await transaction.hex.update({ where: { id: targetId }, data: { [field]: null } });
    }

    await transaction.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: "IMAGE_REMOVED",
        targetType,
        targetId,
        metadata: { field, imageUrl }
      }
    });
  }).catch((error) => {
    if (error instanceof Error && error.message === "IMAGE_TARGET_NOT_FOUND") return null;
    throw error;
  });

  if (!imageUrl) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  try {
    await deleteManagedObject(imageUrl);
  } catch (error) {
    console.error("Image was cleared but storage deletion failed", error);
    return NextResponse.json({ removed: true, storageWarning: true });
  }

  return NextResponse.json({ removed: true });
}
