import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { finalizeCheckoutSession } from "@/lib/finalize-checkout";

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

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    console.info("[stripe-webhook] checkout completed", {
      sessionId: checkout.id,
      h3Index: checkout.metadata?.h3Index ?? null,
      imageUrl: checkout.metadata?.imageUrl ?? null
    });
    const paymentId = checkout.metadata?.paymentId ?? checkout.client_reference_id;
    if (!paymentId) return NextResponse.json({ received: true });

    if (checkout.payment_status !== "paid") {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: "REQUIRES_PAYMENT" },
        data: { status: "PROCESSING", rawEvent: event as object }
      });
      return NextResponse.json({ received: true });
    }

    await finalizeCheckoutSession(checkout, event as object);
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

  if (event.type === "checkout.session.async_payment_failed") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const paymentId = checkout.metadata?.paymentId ?? checkout.client_reference_id;
    if (paymentId) {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: { in: ["REQUIRES_PAYMENT", "PROCESSING"] } },
        data: { status: "FAILED", rawEvent: event as object }
      });
    }
  }

  return NextResponse.json({ received: true });
}
