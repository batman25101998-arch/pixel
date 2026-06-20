import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toFeature } from "@/lib/hex";
import { demoListings } from "@/lib/demo";
import { isDemoMode } from "@/lib/env";

export async function GET() {
  if (isDemoMode) return NextResponse.json({ listings: demoListings });
  try {
    const listings = await prisma.marketplaceListing.findMany({
      where: { active: true, status: "ACTIVE", hex: { status: "FOR_SALE" } },
      take: 100,
      orderBy: { price: "asc" },
      include: {
        hex: true,
        seller: { select: { id: true, displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } }
      }
    });

    return NextResponse.json({
      listings: listings.map((listing) =>
        toFeature({
          ...listing.hex,
          status: "FOR_SALE",
          priceCents: listing.price,
          owner: listing.seller
        })
      )
    });
  } catch (error) {
    console.error("Marketplace listings could not be loaded:", error);
    return NextResponse.json({ listings: [] });
  }
}
