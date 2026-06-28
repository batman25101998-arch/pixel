import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/env";
import { demoRankings } from "@/lib/demo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export default async function LeaderboardPage() {
  const owners = isDemoMode
    ? demoRankings.mostOwnedHexes.map((entry) => ({ id: entry.id, name: entry.name, image: entry.image, count: Number(entry.value) }))
    : (await prisma.user.findMany({ where: { ownedHexes: { some: {} } }, orderBy: { ownedHexes: { _count: "desc" } }, take: 100, select: { id: true, displayName: true, avatarUrl: true, _count: { select: { ownedHexes: true } } } })).map((user) => ({ id: user.id, name: user.displayName, image: user.avatarUrl, count: user._count.ownedHexes }));
  return <main className="mx-auto max-w-3xl px-4 py-8"><div className="mb-6"><p className="text-sm uppercase text-secondary">Leaderboard</p><h1 className="text-3xl font-semibold">Top Earth owners</h1><p className="mt-2 text-muted-foreground">Ranked only by permanently owned hexes.</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /> Most owned hexes</CardTitle></CardHeader><CardContent className="p-0">{owners.map((owner, index) => <div key={owner.id} className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-0"><span className="w-8 text-center font-bold text-muted-foreground">#{index + 1}</span><Avatar><AvatarImage src={owner.image ?? undefined} /><AvatarFallback>{owner.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate font-medium">{owner.name}</span><span className="font-semibold">{formatNumber(owner.count)}</span></div>)}</CardContent></Card></main>;
}
