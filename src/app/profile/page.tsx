import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Globe2, Hexagon, Landmark, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { countryForCoordinates, countryNameForCoordinates } from "@/lib/geography";
import { money } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FounderBadge } from "@/components/founder-badge";
import { KingdomBadge } from "@/components/kingdom-badge";
import { GamificationBadges } from "@/components/gamification-badges";
import { getConnectedHexGroups, getTerritoryLevel, getUserBadges } from "@/lib/gamification";
import { isDemoMode } from "@/lib/env";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export default async function ProfilePage() {
  if (isDemoMode) redirect("/dashboard");

  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedHexes: {
        orderBy: { purchaseDate: "desc" },
        take: 12
      },
      territories: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { hexes: true } } }
      },
      buyerDeals: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 10,
        include: { hex: true }
      },
      sellerDeals: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 10,
        include: { hex: true, buyer: { select: { displayName: true, founderNumber: true, kingdomUnlockedAt: true } } }
      }
    }
  });

  if (!user) redirect("/sign-in");

  const ownedHexCount = await prisma.hex.count({ where: { ownerId: user.id } });
  const allOwnedHexes = await prisma.hex.findMany({
    where: { ownerId: user.id },
    select: {
      h3Index: true,
      latitude: true,
      longitude: true,
      priceCents: true
    }
  });

  const totalSpent = user.buyerDeals.reduce((sum, transaction) => sum + Number(transaction.amountCents), 0);
  const estimatedValue = allOwnedHexes.reduce((sum, hex) => sum + Number(hex.priceCents), 0);
  const countries = new Set(
    allOwnedHexes
      .map((hex) => countryForCoordinates(Number(hex.latitude), Number(hex.longitude))?.name)
      .filter((country): country is string => Boolean(country))
  );
  const fallbackName = user.displayName || user.username;
  const badges = getUserBadges({
    id: user.id,
    name: fallbackName,
    founderNumber: user.founderNumber,
    ownedHexes: allOwnedHexes.map((hex) => ({ h3Index: hex.h3Index, priceCents: Number(hex.priceCents) })),
    territories: user.territories.map((territory) => ({ hexCount: territory._count.hexes })),
    marketplaceListings: user.ownedHexes.filter((hex) => hex.status === "FOR_SALE").length
  });
  const territoryLevel = getTerritoryLevel(getConnectedHexGroups(allOwnedHexes.map((hex) => hex.h3Index))[0]?.length ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-border">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xl">{fallbackName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Owner profile</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold">{user.displayName}</h1>
              <FounderBadge founderNumber={user.founderNumber} />
              <KingdomBadge unlocked={Boolean(user.kingdomUnlockedAt)} />
            </div>
            <p className="text-muted-foreground">@{user.username}</p>
            <div className="mt-2"><GamificationBadges badges={badges} compact /></div>
          </div>
        </div>
        <Button asChild>
          <Link href="/">Browse map</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Joined</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatDate(user.createdAt)}</p>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium">Territory level</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{territoryLevel}</p></CardContent></Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Owned hexes</CardTitle>
            <Hexagon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{ownedHexCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Territories</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{user.territories.length.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{countries.size.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total spent</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{money(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Estimated value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{money(estimatedValue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Owned hexes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.ownedHexes.length ? (
                user.ownedHexes.map((hex) => (
                  <div key={hex.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/50 p-3">
                    <div>
                      <p className="break-all font-medium">{hex.h3Index}</p>
                      <p className="text-sm text-muted-foreground">
                        {countryNameForCoordinates(Number(hex.latitude), Number(hex.longitude))} · purchased {formatDate(hex.purchaseDate)}
                      </p>
                    </div>
                    <span className="font-semibold text-secondary">{money(Number(hex.priceCents))}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No owned hexes yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.buyerDeals.length ? (
                user.buyerDeals.map((transaction) => (
                  <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/50 p-3">
                    <div>
                      <p className="break-all font-medium">{transaction.hex.h3Index}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.type.replace("_", " ").toLowerCase()} · {transaction.completedAt ? formatDate(transaction.completedAt) : formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <span className="font-semibold">{money(Number(transaction.amountCents))}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Territories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.territories.length ? (
                user.territories.map((territory) => (
                  <div key={territory.id} className="rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{territory.name}</p>
                      <span className="text-sm text-muted-foreground">{territory._count.hexes} hexes</span>
                    </div>
                    {territory.description ? <p className="mt-2 text-sm text-muted-foreground">{territory.description}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No territories yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.sellerDeals.length ? (
                user.sellerDeals.map((transaction) => (
                  <div key={transaction.id} className="rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="break-all font-medium">{transaction.hex.h3Index}</p>
                      <span className="font-semibold">{money(Number(transaction.amountCents))}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        Sold to {transaction.buyer.displayName}
                        <FounderBadge founderNumber={transaction.buyer.founderNumber} compact />
                        <KingdomBadge unlocked={Boolean(transaction.buyer.kingdomUnlockedAt)} compact />
                        · {transaction.completedAt ? formatDate(transaction.completedAt) : formatDate(transaction.createdAt)}
                      </span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No sales yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Countries</CardTitle>
            </CardHeader>
            <CardContent>
              {countries.size ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from(countries).map((country) => (
                    <span key={country} className="rounded-md border border-border bg-background/60 px-2 py-1 text-sm">
                      {country}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No country coverage yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
