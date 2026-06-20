import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BuyListingButton } from "@/components/marketplace/buy-listing-button";
import { FounderBadge } from "@/components/founder-badge";
import { KingdomBadge } from "@/components/kingdom-badge";
import { isDemoMode } from "@/lib/env";
import { DemoMarketplace } from "@/components/marketplace/demo-marketplace";

type MarketplaceListing = {
  id: string;
  h3Index: string;
  imageUrl: string | null;
  message: string;
  priceCents: number;
  owner: {
    displayName: string;
    avatarUrl: string | null;
    founderNumber: number | null;
    kingdomUnlockedAt: Date | null;
  };
};

export default async function MarketplacePage() {
  if (isDemoMode) return <DemoMarketplace />;

  let listings: MarketplaceListing[] = [];

  try {
    const activeListings = await prisma.marketplaceListing.findMany({
      where: { active: true, status: "ACTIVE", hex: { status: "FOR_SALE" } },
      take: 100,
      orderBy: { price: "asc" },
      include: {
        hex: { select: { h3Index: true, imageUrl: true, message: true } },
        seller: { select: { displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } }
      }
    });
    listings = activeListings.map((listing) => ({
      id: listing.id,
      h3Index: listing.hex.h3Index,
      imageUrl: listing.hex.imageUrl,
      message: listing.hex.message,
      priceCents: Number(listing.price),
      owner: listing.seller
    }));
  } catch (error) {
    console.error("Marketplace listings could not be loaded:", error);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Marketplace</p>
          <h1 className="text-3xl font-semibold">Hexes listed for resale</h1>
        </div>
        <Button asChild><Link href="/">Browse map</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <Card key={listing.id}>
            {listing.imageUrl ? <img src={listing.imageUrl} alt="" className="aspect-video w-full rounded-t-lg object-cover" /> : null}
            <CardHeader>
              <CardTitle className="break-all text-base">{listing.h3Index}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{listing.owner.displayName}</span>
                  <FounderBadge founderNumber={listing.owner.founderNumber} compact />
                  <KingdomBadge unlocked={Boolean(listing.owner.kingdomUnlockedAt)} compact />
                </span>
                <span className="font-semibold text-secondary">{money(listing.priceCents)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Platform fee: 5% from seller proceeds</p>
              {listing.message ? <p className="mt-3 text-sm text-muted-foreground">{listing.message}</p> : null}
              <BuyListingButton h3Index={listing.h3Index} priceCents={listing.priceCents} />
            </CardContent>
          </Card>
        ))}
      </div>
      {!listings.length ? <Card><CardContent className="pt-5 text-sm text-muted-foreground">No listings yet.</CardContent></Card> : null}
    </div>
  );
}
