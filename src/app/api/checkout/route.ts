import { getResolution } from "h3-js";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env, isDemoMode } from "@/lib/env";
import { assertCell } from "@/lib/hex";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (isDemoMode) return NextResponse.json({ error: "Demo purchases are completed locally in the browser." }, { status: 400 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to purchase a hex." }, { status: 401 });
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { h3Index } = parsed.data;
  assertCell(h3Index);
  if (getResolution(h3Index) !== 5) return NextResponse.json({ error: "Hex must use H3 resolution 5." }, { status: 400 });
  const existing = await prisma.hex.findUnique({ where: { h3Index }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "This hex is already owned." }, { status: 409 });

  const paymentMetadata: Record<string, string> = {
    h3Index,
    title: parsed.data.title,
    message: parsed.data.message
  };
  if (parsed.data.uploadedImageUrl) paymentMetadata.imageUrl = parsed.data.uploadedImageUrl;
  if (parsed.data.externalLink) paymentMetadata.externalLink = parsed.data.externalLink;

  const payment = await prisma.payment.create({
    data: {
      userId: session.user.id,
      amountCents: 100,
      status: "REQUIRES_PAYMENT",
      metadata: paymentMetadata
    }
  });
  const checkoutMetadata: Record<string, string> = {
    paymentId: payment.id,
    h3Index
  };
  if (parsed.data.uploadedImageUrl) checkoutMetadata.imageUrl = parsed.data.uploadedImageUrl;
  console.info("[checkout] metadata", checkoutMetadata);

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: payment.id,
    customer_email: session.user.email ?? undefined,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/cancel?hex=${encodeURIComponent(h3Index)}`,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 100, product_data: { name: "Own a Piece of Earth", description: h3Index } } }],
    metadata: checkoutMetadata
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { providerCheckoutId: checkout.id } });
  return NextResponse.json({ checkoutUrl: checkout.url });
}
