"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Crown, Globe2, Hexagon, Landmark, Medal, Tag, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_USER } from "@/lib/demo";
import {
  createDemoTerritory,
  DEMO_STORAGE_EVENT,
  getDemoOwnedHexes,
  getDemoTerritories,
  type DemoHex,
  type DemoTerritory,
  updateDemoHexMetadata
} from "@/lib/demo-storage";
import { countryNameForCoordinates } from "@/lib/geography";
import { money } from "@/lib/utils";
import { GamificationBadges } from "@/components/gamification-badges";
import { canCreateTerritory, getConnectedHexGroups, getTerritoryLevel, getUserBadges } from "@/lib/gamification";

function DemoHexRow({ hex }: { hex: DemoHex }) {
  const [salePrice, setSalePrice] = useState(String((hex.salePriceCents ?? 100) / 100));

  function toggleListing() {
    const cents = Math.max(100, Math.round(Number(salePrice) * 100));
    updateDemoHexMetadata(hex.h3Index, {
      forSale: !hex.forSale,
      salePriceCents: hex.forSale ? null : cents
    });
  }

  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-all font-medium">{hex.h3Index}</p>
          <p className="text-sm text-muted-foreground">
            {countryNameForCoordinates(hex.latitude, hex.longitude)} · {new Date(hex.purchaseDate).toLocaleDateString()}
          </p>
          {hex.title ? <h3 className="mt-2 text-lg font-semibold">{hex.title}</h3> : null}
          {hex.message ? <p className="mt-1 text-sm">{hex.message}</p> : null}
          {hex.externalLink ? <a href={hex.externalLink} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-primary underline">Visit collectible link</a> : null}
          <div className="mt-3 flex flex-wrap gap-3">
            {hex.avatarUrl ? <img src={hex.avatarUrl} alt="Saved avatar" className="h-12 w-12 rounded-full object-cover" /> : null}
            {hex.imageUrl ? <img src={hex.imageUrl} alt="Saved hex" className="h-20 w-32 rounded-md object-cover" /> : null}
          </div>
        </div>
        <span className="font-semibold text-secondary">{money(hex.salePriceCents ?? hex.priceCents)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <div className="min-w-[140px] flex-1 space-y-1"><Label htmlFor={`sale-${hex.h3Index}`}>Sale price</Label><Input id={`sale-${hex.h3Index}`} type="number" min="1" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /></div>
        <Button type="button" variant={hex.forSale ? "outline" : "default"} onClick={toggleListing}>
          <Tag className="h-4 w-4" /> {hex.forSale ? "Remove listing" : "List for sale"}
        </Button>
      </div>
    </div>
  );
}

export function DemoDashboard() {
  const [ownedHexes, setOwnedHexes] = useState<DemoHex[]>([]);
  const [territories, setTerritories] = useState<DemoTerritory[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setOwnedHexes(getDemoOwnedHexes().filter((hex) => hex.ownerId === DEMO_USER.id));
      setTerritories(getDemoTerritories());
    };
    refresh();
    window.addEventListener(DEMO_STORAGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DEMO_STORAGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const countries = useMemo(() => new Set(ownedHexes.map((hex) => countryNameForCoordinates(hex.latitude, hex.longitude))), [ownedHexes]);
  const totalSpent = ownedHexes.reduce((sum, hex) => sum + hex.priceCents, 0);
  const connectedGroups = useMemo(() => getConnectedHexGroups(ownedHexes), [ownedHexes]);
  const largestConnected = connectedGroups[0]?.length ?? 0;
  const territoryLevel = getTerritoryLevel(largestConnected);
  const badges = getUserBadges({
    id: DEMO_USER.id,
    name: DEMO_USER.name,
    founderNumber: DEMO_USER.founderNumber,
    ownedHexes,
    marketplaceListings: ownedHexes.filter((hex) => hex.forSale).length
  });
  const stats = [
    { label: "Founder number", value: `#${DEMO_USER.founderNumber}`, icon: Crown },
    { label: "Owner rank", value: "#4,275", icon: Medal },
    { label: "Owned hexes", value: ownedHexes.length, icon: Hexagon },
    { label: "Territories", value: territories.length, icon: Landmark },
    { label: "Countries", value: countries.size, icon: Globe2 },
    { label: "Total spent", value: money(totalSpent), icon: Wallet },
    { label: "Kingdom status", value: largestConnected >= 1000 ? "Unlocked" : `${1000 - largestConnected} to go`, icon: Crown },
    { label: "Joined", value: "Jan 1, 2026", icon: CalendarDays }
  ];

  function selectLargestConnectedGroup() {
    const group = getConnectedHexGroups(ownedHexes)[0] ?? [];
    if (group.length >= 10) {
      setSelected(group);
      setError(null);
      return;
    }
    setError("Buy at least 10 connected hexes before creating a village.");
  }

  function createTerritory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      createDemoTerritory({
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        bannerImageUrl: String(form.get("bannerImageUrl") ?? ""),
        flagImageUrl: String(form.get("flagImageUrl") ?? ""),
        color: String(form.get("color") ?? "#22c55e"),
        hexIndexes: selected
      });
      setSelected([]);
      setError(null);
      event.currentTarget.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create demo kingdom.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm uppercase tracking-wide text-secondary">Demo owner</p><h1 className="text-3xl font-semibold">{DEMO_USER.name}</h1><p className="mt-1 text-muted-foreground">{territoryLevel} · {largestConnected} connected hexes</p></div>
        <div className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-right"><p className="text-xs uppercase tracking-wide text-emerald-200">Demo balance</p><p className="text-xl font-semibold text-emerald-100">{money(DEMO_USER.balanceCents)}</p></div>
      </div>

      <Card className="mt-4"><CardHeader><CardTitle>Badges</CardTitle></CardHeader><CardContent><GamificationBadges badges={badges} /></CardContent></Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-semibold">{String(value)}</p></CardContent></Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{canCreateTerritory(ownedHexes) ? "Create Village" : "Village locked"}</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createTerritory}>
                <div className="space-y-1.5"><Label htmlFor="kingdom-name">Kingdom name</Label><Input id="kingdom-name" name="name" required /></div>
                <div className="space-y-1.5"><Label htmlFor="kingdom-description">Description</Label><Textarea id="kingdom-description" name="description" /></div>
                <div className="space-y-1.5"><Label htmlFor="kingdom-banner">Banner image URL</Label><Input id="kingdom-banner" name="bannerImageUrl" type="url" /></div>
                <div className="space-y-1.5"><Label htmlFor="kingdom-flag">Flag / image URL</Label><Input id="kingdom-flag" name="flagImageUrl" type="url" /></div>
                <div className="space-y-1.5"><Label htmlFor="kingdom-color">Territory color</Label><Input id="kingdom-color" name="color" type="color" defaultValue="#22c55e" className="h-10 p-1" /></div>
                <Button type="button" variant="outline" className="w-full" onClick={selectLargestConnectedGroup}>Select largest connected group</Button>
                <p className="text-xs text-muted-foreground">{selected.length} connected candidates selected</p>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button className="w-full" disabled={selected.length < 10}>Create Village</Button>
              </form>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Territories and kingdoms</CardTitle></CardHeader><CardContent className="space-y-3">
            {territories.length ? territories.map((territory) => <div key={territory.id} className="rounded-md border border-border p-3" style={{ borderLeftColor: territory.color, borderLeftWidth: 4 }}>
              {territory.bannerImageUrl ? <img src={territory.bannerImageUrl} alt="" className="mb-3 aspect-[3/1] w-full rounded-md object-cover" /> : null}
              <div className="flex items-center gap-3">{territory.flagImageUrl ? <img src={territory.flagImageUrl} alt="" className="h-10 w-10 rounded-md object-cover" /> : null}<div><p className="font-semibold">{territory.name}</p><p className="text-xs text-muted-foreground">{getTerritoryLevel(territory.hexIndexes.length)} · {territory.hexIndexes.length} connected hexes</p></div></div>
              {territory.description ? <p className="mt-2 text-sm text-muted-foreground">{territory.description}</p> : null}
            </div>) : <p className="text-sm text-muted-foreground">No demo kingdoms yet.</p>}
          </CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Your locally owned hexes</CardTitle></CardHeader><CardContent className="space-y-3">
          {ownedHexes.length ? ownedHexes.map((hex) => <DemoHexRow key={hex.h3Index} hex={hex} />) : <p className="text-sm text-muted-foreground">Choose an available hex on the map and buy it to begin testing.</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}
