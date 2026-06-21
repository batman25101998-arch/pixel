import { NextResponse } from "next/server";
import { gridDisk } from "h3-js";
import { auth } from "@/auth";
import { finalizeCheckoutSession } from "@/lib/finalize-checkout";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type PaymentMetadata = {
  h3Index?: string;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to view checkout status." }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Stripe checkout session id is required." }, { status: 400 });
  }

  const paymentQuery = {
    where: {
      providerCheckoutId: sessionId,
      userId: session.user.id
    },
    include: {
      transaction: {
        include: {
          hex: {
            include: {
              owner: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                  founderNumber: true,
                  kingdomUnlockedAt: true
                }
              }
            }
          }
        }
      }
    }
  } as const;

  let payment = await prisma.payment.findFirst(paymentQuery);

  if (!payment) {
    return NextResponse.json({ status: "PENDING" });
  }

  if (payment.status !== "SUCCEEDED") {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(sessionId);
      if (checkout.payment_status === "paid") {
        await finalizeCheckoutSession(checkout);
        payment = await prisma.payment.findFirst(paymentQuery);
      }
    } catch (error) {
      console.error("Stripe checkout confirmation failed", error);
    }
  }

  if (!payment) return NextResponse.json({ status: "PENDING" });

  const metadata = payment.metadata as PaymentMetadata;
  const hex =
    payment.transaction?.hex ??
    (metadata.h3Index
      ? await prisma.hex.findUnique({
          where: { h3Index: metadata.h3Index },
          include: {
            owner: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                founderNumber: true,
                kingdomUnlockedAt: true
              }
            }
          }
        })
      : null);
  const adjacentOwnedCount = payment.status === "SUCCEEDED" && hex
    ? await prisma.hex.count({
        where: {
          ownerId: session.user.id,
          h3Index: { in: gridDisk(hex.h3Index, 1).filter((index) => index !== hex.h3Index) }
        }
      })
    : 0;

  return NextResponse.json({
    status: payment.status,
    paymentId: payment.id,
    certificate:
      payment.status === "SUCCEEDED" && hex
        ? {
            id: hex.id,
            h3Index: hex.h3Index,
            latitude: Number(hex.latitude),
            longitude: Number(hex.longitude),
            ownerName: hex.owner.displayName,
            ownerImage: hex.avatarUrl ?? hex.owner.avatarUrl,
            avatarUrl: hex.avatarUrl,
            ownerFounderNumber: hex.owner.founderNumber,
            ownerKingdomUnlocked: Boolean(hex.owner.kingdomUnlockedAt),
            adjacentOwnedCount,
            title: hex.title,
            message: hex.message,
            imageUrl: hex.imageUrl,
            externalLink: hex.link,
            priceCents: Number(hex.priceCents),
            purchaseDate: hex.purchaseDate.toISOString()
          }
        : null
  });
}
