import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexEditor } from "@/components/dashboard/hex-editor";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { TerritoryForm } from "@/components/dashboard/territory-form";
import { FounderBadge } from "@/components/founder-badge";
import { KingdomBadge } from "@/components/kingdom-badge";
import { DemoDashboard } from "@/components/dashboard/demo-dashboard";
import { isDemoMode } from "@/lib/env";
import { GamificationBadges } from "@/components/gamification-badges";
import { getConnectedHexGroups, getTerritoryLevel, getUserBadges } from "@/lib/gamification";

export default async function DashboardPage() {
  if (isDemoMode) return <DemoDashboard />;

  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedHexes: { orderBy: { purchaseDate: "desc" } },
      territories: { include: { _count: { select: { hexes: true } } } }
    }
  });
  if (!user) redirect("/sign-in");
  const badges = getUserBadges({
    id: user.id,
    name: user.displayName,
    founderNumber: user.founderNumber,
    ownedHexes: user.ownedHexes.map((hex) => ({ h3Index: hex.h3Index, priceCents: Number(hex.priceCents) })),
    marketplaceListings: user.ownedHexes.filter((hex) => hex.status === "FOR_SALE").length
  });
  const territoryLevel = getTerritoryLevel(getConnectedHexGroups(user.ownedHexes.map((hex) => hex.h3Index))[0]?.length ?? 0);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex flex-wrap items-center gap-2">Owner profile <FounderBadge founderNumber={user.founderNumber} compact /><KingdomBadge unlocked={Boolean(user.kingdomUnlockedAt)} compact /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">@{user.username}</p>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <GamificationBadges badges={badges} />
            <ProfileForm user={user} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Combine territory</CardTitle></CardHeader>
          <CardContent>
            <TerritoryForm
              hexes={user.ownedHexes
                .filter((hex) => !hex.territoryId)
                .map((hex) => ({
                  id: hex.id,
                  h3Index: hex.h3Index,
                  priceCents: Number(hex.priceCents)
                }))}
            />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader><CardTitle>{user.ownedHexes.length}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Owned hexes</CardContent></Card>
          <Card><CardHeader><CardTitle>{user.territories.length}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Territories</CardContent></Card>
          <Card><CardHeader><CardTitle>${user.ownedHexes.reduce((sum, hex) => sum + Number(hex.priceCents), 0) / 100}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Listed value</CardContent></Card>
          <Card><CardHeader><CardTitle>{territoryLevel}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Connected territory level</CardContent></Card>
        </div>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Your hexes</h2>
          {user.ownedHexes.length ? user.ownedHexes.map((hex) => <HexEditor key={hex.id} hex={hex} />) : (
            <Card><CardContent className="pt-5 text-sm text-muted-foreground">You have not purchased a hex yet.</CardContent></Card>
          )}
        </section>
      </div>
    </div>
  );
}
