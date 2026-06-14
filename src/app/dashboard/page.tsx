import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexEditor } from "@/components/dashboard/hex-editor";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { TerritoryForm } from "@/components/dashboard/territory-form";

export default async function DashboardPage() {
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

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Owner profile</CardTitle></CardHeader>
          <CardContent><ProfileForm user={user} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Combine territory</CardTitle></CardHeader>
          <CardContent><TerritoryForm hexes={user.ownedHexes.map((hex) => ({ id: hex.id, h3Index: hex.h3Index }))} /></CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader><CardTitle>{user.ownedHexes.length}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Owned hexes</CardContent></Card>
          <Card><CardHeader><CardTitle>{user.territories.length}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Territories</CardContent></Card>
          <Card><CardHeader><CardTitle>${user.ownedHexes.reduce((sum, hex) => sum + Number(hex.priceCents), 0) / 100}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Listed value</CardContent></Card>
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
