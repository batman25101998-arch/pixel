import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  const payment = await prisma.payment.findFirst({
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
                  avatarUrl: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!payment) {
    return NextResponse.json({ status: "PENDING" });
  }

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
                avatarUrl: true
              }
            }
          }
        })
      : null);

  return NextResponse.json({
    status: payment.status,
    paymentId: payment.id,
    certificate:
      payment.status === "SUCCEEDED" && hex
        ? {
            id: payment.transaction?.id ?? payment.id,
            h3Index: hex.h3Index,
            latitude: Number(hex.latitude),
            longitude: Number(hex.longitude),
            ownerName: hex.owner.displayName,
            ownerImage: hex.avatarUrl ?? hex.owner.avatarUrl,
            message: hex.message,
            imageUrl: hex.imageUrl,
            priceCents: Number(hex.priceCents),
            purchaseDate: hex.purchaseDate.toISOString()
          }
        : null
  });
}
