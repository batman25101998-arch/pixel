import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validators";
import { assertCell } from "@/lib/hex";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to purchase a hex." }, { status: 401 });

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  assertCell(parsed.data.h3Index);

  const existing = await prisma.hex.findUnique({ where: { h3Index: parsed.data.h3Index } });
  if (existing && existing.status !== "FOR_SALE") {
    return NextResponse.json({ error: "This hex is already owned." }, { status: 409 });
  }

  const amountCents = existing?.status === "FOR_SALE" ? Number(existing.priceCents) : 100;
  const payment = await prisma.payment.create({
    data: {
      userId: session.user.id,
      amountCents,
      status: "REQUIRES_PAYMENT",
      metadata: {
        h3Index: parsed.data.h3Index,
        hexId: existing?.id,
        message: parsed.data.message,
        avatarUrl: parsed.data.avatarUrl,
        imageUrl: parsed.data.imageUrl
      }
    }
  });

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: payment.id,
    customer_email: session.user.email ?? undefined,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/?checkout=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: existing ? "Earth hex resale" : "Own a Pixel of Earth hex",
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
