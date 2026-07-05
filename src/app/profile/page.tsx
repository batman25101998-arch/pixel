import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Hexagon, Medal } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoProfile } from "@/components/profile/demo-profile";
import { isDemoMode } from "@/lib/env";
import { formatNumber } from "@/lib/utils";

export default async function ProfilePage() {
  if (isDemoMode) return <DemoProfile />;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { ownedHexes: { orderBy: { purchaseDate: "desc" }, take: 12 } }
  });
  if (!user) redirect("/sign-in");
  const [ownedHexCount, rankedOwners] = await Promise.all([
    prisma.hex.count({ where: { ownerId: user.id } }),
    prisma.user.findMany({ where: { ownedHexes: { some: {} } }, orderBy: { ownedHexes: { _count: "desc" } }, take: 1000, select: { id: true } })
  ]);
  const rankIndex = rankedOwners.findIndex((owner) => owner.id === user.id);
  const name = user.displayName || user.username;

  return <div className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><Avatar className="h-20 w-20"><AvatarImage src={user.avatarUrl ?? undefined} /><AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><h1 className="text-3xl font-semibold">{name}</h1><p className="text-muted-foreground">@{user.username}</p></div></div><Button asChild><Link href="/">Browse map</Link></Button></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Hexagon className="h-4 w-4" /> Owned hexes</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatNumber(ownedHexCount)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Medal className="h-4 w-4" /> Owner rank</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rankIndex >= 0 ? `#${formatNumber(rankIndex + 1)}` : "Unranked"}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4" /> Joined</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(user.createdAt)}</CardContent></Card></div>
    <Card className="mt-5"><CardHeader><CardTitle>Permanent collection</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{user.ownedHexes.length ? user.ownedHexes.map((hex) => <div key={hex.id} className="overflow-hidden rounded-md border border-border">{hex.imageUrl ? <img src={hex.imageUrl} alt="" className="aspect-video w-full object-cover" /> : null}<div className="space-y-3 p-3"><div><p className="break-all text-sm font-medium">{hex.title || hex.h3Index}</p>{hex.message ? <p className="mt-1 text-sm text-muted-foreground">{hex.message}</p> : null}</div><Button asChild size="sm" variant="outline"><Link href={`/?focusHex=${encodeURIComponent(hex.h3Index)}`}>View on Map</Link></Button></div></div>) : <p className="text-sm text-muted-foreground">No hexes owned yet.</p>}</CardContent></Card>
  </div>;
}
