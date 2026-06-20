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
  priceCents: bigint | number;
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
    listings = await prisma.hex.findMany({
      where: { status: "FOR_SALE" },
      take: 100,
      orderBy: { priceCents: "asc" },
      include: { owner: { select: { displayName: true, avatarUrl: true, founderNumber: true, kingdomUnlockedAt: true } } }
    });
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
        {listings.map((hex) => (
          <Card key={hex.id}>
            {hex.imageUrl ? <img src={hex.imageUrl} alt="" className="aspect-video w-full rounded-t-lg object-cover" /> : null}
            <CardHeader>
              <CardTitle className="break-all text-base">{hex.h3Index}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{hex.owner.displayName}</span>
                  <FounderBadge founderNumber={hex.owner.founderNumber} compact />
                  <KingdomBadge unlocked={Boolean(hex.owner.kingdomUnlockedAt)} compact />
                </span>
                <span className="font-semibold text-secondary">{money(Number(hex.priceCents))}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Platform fee: 5% from seller proceeds</p>
              {hex.message ? <p className="mt-3 text-sm text-muted-foreground">{hex.message}</p> : null}
              <BuyListingButton h3Index={hex.h3Index} priceCents={Number(hex.priceCents)} />
            </CardContent>
          </Card>
        ))}
      </div>
      {!listings.length ? <Card><CardContent className="pt-5 text-sm text-muted-foreground">No listings yet.</CardContent></Card> : null}
    </div>
  );
}
