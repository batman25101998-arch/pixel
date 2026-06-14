import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function MarketplacePage() {
  const listings = await prisma.hex.findMany({
    where: { status: "FOR_SALE" },
    take: 100,
    orderBy: { priceCents: "asc" },
    include: { owner: { select: { displayName: true, avatarUrl: true } } }
  });

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
                <span className="text-sm text-muted-foreground">{hex.owner.displayName}</span>
                <span className="font-semibold text-secondary">{money(Number(hex.priceCents))}</span>
              </div>
              {hex.message ? <p className="mt-3 text-sm text-muted-foreground">{hex.message}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {!listings.length ? <Card><CardContent className="pt-5 text-sm text-muted-foreground">No resale listings yet.</CardContent></Card> : null}
    </div>
  );
}
