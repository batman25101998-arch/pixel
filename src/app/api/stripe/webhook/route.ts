import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { axialForCell, centerForCell, geoJsonPolygonSql } from "@/lib/hex";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const paymentId = checkout.metadata?.paymentId ?? checkout.client_reference_id;
    if (!paymentId) return NextResponse.json({ received: true });

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === "SUCCEEDED") return NextResponse.json({ received: true });

    const metadata = payment.metadata as {
      h3Index?: string;
      message?: string;
      avatarUrl?: string;
      imageUrl?: string;
    };
    if (!metadata.h3Index) return NextResponse.json({ received: true });

    const center = centerForCell(metadata.h3Index);
    const axial = axialForCell(metadata.h3Index);
    const polygon = geoJsonPolygonSql(metadata.h3Index);

    await prisma.$transaction(async (tx) => {
      const current = await tx.hex.findUnique({ where: { h3Index: metadata.h3Index! } });
      if (current && current.status !== "FOR_SALE") {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "CANCELED", rawEvent: event as object } });
        return;
      }

      const hex = current
        ? await tx.hex.update({
            where: { id: current.id },
            data: {
              ownerId: payment.userId,
              purchaseDate: new Date(),
              message: metadata.message ?? current.message,
              avatarUrl: metadata.avatarUrl ?? current.avatarUrl,
              imageUrl: metadata.imageUrl ?? current.imageUrl,
              status: "OWNED",
              priceCents: 100
            }
          })
        : await tx.hex.create({
            data: {
              h3Index: metadata.h3Index!,
              q: axial.q,
              r: axial.r,
              latitude: center.latitude,
              longitude: center.longitude,
              ownerId: payment.userId,
              priceCents: 100,
              message: metadata.message ?? "",
              avatarUrl: metadata.avatarUrl,
              imageUrl: metadata.imageUrl
            }
          });

      await tx.$executeRawUnsafe(
        `UPDATE hexes SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2::uuid`,
        polygon,
        hex.id
      );

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          providerPaymentIntent: typeof checkout.payment_intent === "string" ? checkout.payment_intent : null,
          rawEvent: event as object
        }
      });

      await tx.transaction.create({
        data: {
          hexId: hex.id,
          buyerId: payment.userId,
          sellerId: current?.ownerId,
          paymentId: payment.id,
          type: current ? "RESALE_PURCHASE" : "PRIMARY_PURCHASE",
          status: "COMPLETED",
          amountCents: payment.amountCents,
          currency: payment.currency,
          metadata: { h3Index: metadata.h3Index },
          completedAt: new Date()
        }
      });
    });
  }

  if (event.type === "checkout.session.expired") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const paymentId = checkout.metadata?.paymentId ?? checkout.client_reference_id;
    if (paymentId) {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: "REQUIRES_PAYMENT" },
        data: { status: "CANCELED", rawEvent: event as object }
      });
    }
  }

  return NextResponse.json({ received: true });
}
