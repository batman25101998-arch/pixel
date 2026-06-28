import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { axialForCell, centerForCell } from "@/lib/hex";
import { countryForCoordinates } from "@/lib/geography";

type PaymentMetadata = {
  h3Index?: string;
  message?: string;
  title?: string;
  avatarUrl?: string;
  imageUrl?: string;
  externalLink?: string;
};

export type CheckoutFinalizationResult =
  | "COMPLETED"
  | "ALREADY_COMPLETED"
  | "IN_PROGRESS"
  | "NOT_FOUND"
  | "NOT_PAID"
  | "CANCELED";

export async function finalizeCheckoutSession(
  checkout: Stripe.Checkout.Session,
  rawEvent: object = checkout
): Promise<CheckoutFinalizationResult> {
  if (checkout.payment_status !== "paid") return "NOT_PAID";

  const paymentId = checkout.metadata?.paymentId ?? checkout.client_reference_id;
  if (!paymentId) return "NOT_FOUND";

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return "NOT_FOUND";
    if (payment.status === "SUCCEEDED") return "ALREADY_COMPLETED";

    const claim = await tx.payment.updateMany({
      where: {
        id: payment.id,
        updatedAt: payment.updatedAt,
        status: { in: ["REQUIRES_PAYMENT", "PROCESSING"] }
      },
      data: { status: "PROCESSING" }
    });
    if (claim.count !== 1) return "IN_PROGRESS";

    const metadata = payment.metadata as PaymentMetadata;
    if (!metadata.h3Index) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "CANCELED" } });
      return "CANCELED";
    }

    const current = await tx.hex.findUnique({
      where: { h3Index: metadata.h3Index }
    });
    if (current) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELED", rawEvent: rawEvent as Prisma.InputJsonValue }
      });
      return "CANCELED";
    }

    const center = centerForCell(metadata.h3Index);
    const countryCode = countryForCoordinates(center.latitude, center.longitude)?.code ?? null;
    const axial = axialForCell(metadata.h3Index);
    const hex = await tx.hex.create({
          data: {
            h3Index: metadata.h3Index,
            q: axial.q,
            r: axial.r,
            latitude: center.latitude,
            longitude: center.longitude,
            countryCode,
            ownerId: payment.userId,
            title: metadata.title ?? "",
            message: metadata.message ?? "",
            avatarUrl: metadata.avatarUrl,
            imageUrl: metadata.imageUrl,
            link: metadata.externalLink,
            status: "OWNED",
            priceCents: 100
          }
        });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        providerPaymentIntent: typeof checkout.payment_intent === "string" ? checkout.payment_intent : null,
        rawEvent: rawEvent as Prisma.InputJsonValue
      }
    });

    await tx.transaction.create({
      data: {
        hexId: hex.id,
        buyerId: payment.userId,
        paymentId: payment.id,
        type: "PRIMARY_PURCHASE",
        status: "COMPLETED",
        amount: payment.amountCents,
        platformFeeCents: 0,
        currency: payment.currency,
        metadata: {
          h3Index: metadata.h3Index,
          permanentOwnership: true
        },
        completedAt: new Date()
      }
    });

    return "COMPLETED";
  });
}
