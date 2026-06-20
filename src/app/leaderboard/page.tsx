import {
  Clock3,
  Crown,
  Flag,
  Globe2,
  Hexagon,
  Landmark,
  ReceiptText,
  Sparkles,
  Trophy,
  Users
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FounderBadge } from "@/components/founder-badge";
import { KingdomBadge } from "@/components/kingdom-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGlobalRankings, type RankedOwner } from "@/lib/rankings";
import { money } from "@/lib/utils";
import { demoRankings } from "@/lib/demo";
import { isDemoMode } from "@/lib/env";

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function RankingCard({
  title,
  icon: Icon,
  entries,
  valueLabel
}: {
  title: string;
  icon: typeof Trophy;
  entries: RankedOwner[];
  valueLabel: (entry: RankedOwner) => string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/20">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-secondary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length ? entries.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-0">
            <span className={`w-6 text-center font-semibold ${index < 3 ? "text-secondary" : "text-muted-foreground"}`}>
              {index + 1}
            </span>
            <Avatar className="h-9 w-9">
              <AvatarImage src={entry.image ?? undefined} />
              <AvatarFallback>{initials(entry.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate font-medium">{entry.name}</p>
                <FounderBadge founderNumber={entry.founderNumber} compact />
                <KingdomBadge unlocked={entry.kingdomUnlocked} compact />
              </div>
              {entry.secondary ? <p className="truncate text-xs text-muted-foreground">{entry.secondary}</p> : null}
            </div>
            <span className="shrink-0 font-semibold">{valueLabel(entry)}</span>
          </div>
        )) : (
          <p className="p-5 text-sm text-muted-foreground">No ranking data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function LeaderboardPage() {
  const rankings = isDemoMode ? demoRankings : await getGlobalRankings(10);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm uppercase tracking-wide text-secondary">
            <Sparkles className="h-4 w-4" /> Global rankings
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Earth's leading owners</h1>
          <p className="mt-2 text-muted-foreground">Live standings based on completed purchases and current ownership.</p>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <RankingCard
          title="Largest territory"
          icon={Flag}
          entries={rankings.largestTerritories}
          valueLabel={(entry) => `${entry.value.toLocaleString()} hexes`}
        />
        <RankingCard
          title="Most owned hexes"
          icon={Hexagon}
          entries={rankings.mostOwnedHexes}
          valueLabel={(entry) => entry.value.toLocaleString()}
        />
        <RankingCard
          title="Most valuable hexes"
          icon={Crown}
          entries={rankings.highestValue}
          valueLabel={(entry) => money(entry.value)}
        />
        <RankingCard
          title="Most countries"
          icon={Globe2}
          entries={rankings.mostCountries}
          valueLabel={(entry) => `${entry.value.toLocaleString()} countries`}
        />
        <RankingCard
          title="Most villages, cities, and kingdoms"
          icon={Landmark}
          entries={rankings.mostSettlements}
          valueLabel={(entry) => entry.value.toLocaleString()}
        />
        <RankingCard
          title="Newest owners"
          icon={Users}
          entries={rankings.newestOwners}
          valueLabel={(entry) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(entry.value))}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <RankingCard
          title="First buyers"
          icon={Clock3}
          entries={rankings.firstBuyers}
          valueLabel={(entry) => new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }).format(new Date(entry.value))}
        />

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4 text-secondary" /> Recent purchases
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rankings.recentPurchases.length ? rankings.recentPurchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={purchase.buyerImage ?? undefined} />
                  <AvatarFallback>{initials(purchase.buyerName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-medium">{purchase.buyerName}</p>
                    <FounderBadge founderNumber={purchase.buyerFounderNumber} compact />
                    <KingdomBadge unlocked={purchase.buyerKingdomUnlocked} compact />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {purchase.type === "RESALE_PURCHASE" ? "Resale" : "First sale"} · {purchase.h3Index} · {formatDate(purchase.purchasedAt)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-secondary">{money(purchase.amountCents)}</span>
              </div>
            )) : (
              <p className="p-5 text-sm text-muted-foreground">No completed purchases yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
