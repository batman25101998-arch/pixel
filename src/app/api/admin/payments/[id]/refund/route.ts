import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { transaction: { include: { hex: { select: { ownerId: true } } } } }
  });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status === "REFUNDED") return NextResponse.json({ error: "Payment is already refunded." }, { status: 409 });
  if (payment.status !== "SUCCEEDED" || !payment.providerPaymentIntent) {
    return NextResponse.json({ error: "Only succeeded Stripe payments can be refunded." }, { status: 409 });
  }

  try {
    const refund = await stripe.refunds.create(
      { payment_intent: payment.providerPaymentIntent, reason: "requested_by_customer" },
      { idempotencyKey: `admin-refund-${payment.id}` }
    );

    await prisma.$transaction(async (transaction) => {
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED", providerRefundId: refund.id, refundedAt: new Date() }
      });
      if (payment.transaction) {
        await transaction.transaction.update({
          where: { id: payment.transaction.id },
          data: { status: "REVERSED" }
        });
        if (payment.transaction.hex.ownerId === payment.transaction.buyerId) {
          await transaction.hex.update({
            where: { id: payment.transaction.hexId },
            data: { status: "LOCKED" }
          });
          await transaction.marketplaceListing.updateMany({
              where: { hexId: payment.transaction.hexId, status: "ACTIVE", active: true },
              data: { status: "CANCELED", active: false }
          });
        }
      }
      await transaction.adminAuditLog.create({
        data: {
          adminId: session.user.id,
          action: "PAYMENT_REFUNDED",
          targetType: "payment",
          targetId: payment.id,
          metadata: { refundId: refund.id, amountCents: Number(payment.amountCents) }
        }
      });
    });

    return NextResponse.json({ refunded: true, refundId: refund.id });
  } catch (error) {
    console.error("Stripe refund failed", error);
    return NextResponse.json({ error: "Stripe could not complete the refund." }, { status: 502 });
  }
}
