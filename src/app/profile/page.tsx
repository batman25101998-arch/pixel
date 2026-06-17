import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Globe2, Hexagon, Landmark, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CountryBox = {
  name: string;
  west: number;
  south: number;
  east: number;
  north: number;
};

const countryBoxes: CountryBox[] = [
  { name: "United States", west: -125, south: 24, east: -66, north: 49 },
  { name: "Canada", west: -141, south: 49, east: -52, north: 70 },
  { name: "Mexico", west: -118, south: 14, east: -86, north: 33 },
  { name: "Brazil", west: -74, south: -34, east: -34, north: 6 },
  { name: "Argentina", west: -74, south: -56, east: -53, north: -21 },
  { name: "United Kingdom", west: -8, south: 49, east: 2, north: 59 },
  { name: "France", west: -5, south: 42, east: 8, north: 51 },
  { name: "Spain", west: -10, south: 36, east: 4, north: 44 },
  { name: "Germany", west: 5, south: 47, east: 16, north: 55 },
  { name: "Italy", west: 6, south: 36, east: 19, north: 47 },
  { name: "Poland", west: 14, south: 49, east: 24, north: 55 },
  { name: "Ukraine", west: 22, south: 44, east: 41, north: 53 },
  { name: "Russia", west: 30, south: 41, east: 180, north: 82 },
  { name: "South Africa", west: 16, south: -35, east: 33, north: -22 },
  { name: "Egypt", west: 25, south: 22, east: 36, north: 32 },
  { name: "Nigeria", west: 2, south: 4, east: 15, north: 14 },
  { name: "India", west: 68, south: 7, east: 98, north: 36 },
  { name: "China", west: 73, south: 18, east: 135, north: 54 },
  { name: "Japan", west: 129, south: 31, east: 146, north: 46 },
  { name: "Indonesia", west: 95, south: -11, east: 141, north: 6 },
  { name: "Australia", west: 112, south: -44, east: 154, north: -10 }
];

function countryFor(latitude: number, longitude: number) {
  return (
    countryBoxes.find(
      (country) =>
        longitude >= country.west &&
        longitude <= country.east &&
        latitude >= country.south &&
        latitude <= country.north
    )?.name ?? "International waters"
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export default async function ProfilePage() {
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
        include: { hex: true, buyer: { select: { displayName: true } } }
      }
    }
  });

  if (!user) redirect("/sign-in");

  const ownedHexCount = await prisma.hex.count({ where: { ownerId: user.id } });
  const allOwnedHexes = await prisma.hex.findMany({
    where: { ownerId: user.id },
    select: {
      latitude: true,
      longitude: true,
      priceCents: true
    }
  });

  const totalSpent = user.buyerDeals.reduce((sum, transaction) => sum + Number(transaction.amountCents), 0);
  const estimatedValue = allOwnedHexes.reduce((sum, hex) => sum + Number(hex.priceCents), 0);
  const countries = new Set(
    allOwnedHexes.map((hex) => countryFor(Number(hex.latitude), Number(hex.longitude)))
  );
  const fallbackName = user.displayName || user.username;

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
            <h1 className="text-3xl font-semibold">{user.displayName}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/">Browse map</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Joined</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatDate(user.createdAt)}</p>
          </CardContent>
        </Card>
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
                        {countryFor(Number(hex.latitude), Number(hex.longitude))} · purchased {formatDate(hex.purchaseDate)}
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
                      Sold to {transaction.buyer.displayName} · {transaction.completedAt ? formatDate(transaction.completedAt) : formatDate(transaction.createdAt)}
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
