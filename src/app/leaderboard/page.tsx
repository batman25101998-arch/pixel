import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export default async function LeaderboardPage() {
  const owners = await prisma.user.findMany({
    take: 50,
    orderBy: { ownedHexes: { _count: "desc" } },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      _count: { select: { ownedHexes: true, territories: true } }
    }
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">Leaderboard</p>
      <h1 className="mb-6 text-3xl font-semibold">Largest Earth holdings</h1>
      <div className="space-y-3">
        {owners.map((owner, index) => {
          const name = owner.displayName;
          return (
            <Card key={owner.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <span className="w-8 text-center text-lg font-semibold text-secondary">{index + 1}</span>
                <Avatar>
                  <AvatarImage src={owner.avatarUrl ?? undefined} />
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">{owner._count.territories} territories</p>
                </div>
                <span className="font-semibold">{owner._count.ownedHexes} hexes</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
