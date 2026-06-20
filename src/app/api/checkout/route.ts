import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validators";
import { assertCell } from "@/lib/hex";
import { env, isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  if (isDemoMode) {
    return NextResponse.json({ error: "Demo purchases are completed locally in the browser." }, { status: 400 });
  }
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to purchase a hex." }, { status: 401 });

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  assertCell(parsed.data.h3Index);

  const existing = await prisma.hex.findUnique({
    where: { h3Index: parsed.data.h3Index },
    include: {
      listings: {
        where: { status: "ACTIVE", active: true },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (existing && existing.status !== "FOR_SALE") {
    return NextResponse.json({ error: "This hex is already owned." }, { status: 409 });
  }
  if (existing?.ownerId === session.user.id) {
    return NextResponse.json({ error: "You already own this hex." }, { status: 409 });
  }
  if (existing?.status === "FOR_SALE" && existing.listings.length === 0) {
    return NextResponse.json({ error: "This listing is no longer available." }, { status: 409 });
  }

  const activeListing = existing?.listings[0] ?? null;
  const amountCents = activeListing ? Number(activeListing.price) : 100;
  const payment = await prisma.payment.create({
    data: {
      userId: session.user.id,
      amountCents,
      status: "REQUIRES_PAYMENT",
      metadata: {
        h3Index: parsed.data.h3Index,
        hexId: existing?.id,
        marketplaceId: activeListing?.id,
        sellerId: activeListing?.sellerId,
        title: parsed.data.title,
        message: parsed.data.message,
        avatarUrl: parsed.data.avatarUrl,
        imageUrl: parsed.data.imageUrl,
        externalLink: parsed.data.externalLink
      }
    }
  });

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: payment.id,
    customer_email: session.user.email ?? undefined,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/?checkout=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: activeListing ? "Earth hex resale" : "Own a Pixel of Earth hex",
            description: parsed.data.h3Index
          }
        }
      }
    ],
    metadata: {
      paymentId: payment.id,
      h3Index: parsed.data.h3Index
    }
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerCheckoutId: checkout.id }
  });

  return NextResponse.json({ checkoutUrl: checkout.url });
}
