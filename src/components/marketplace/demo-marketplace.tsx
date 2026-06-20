"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cellToLatLng } from "h3-js";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_USER, demoListings } from "@/lib/demo";
import { buyDemoHex, DEMO_STORAGE_EVENT, getDemoOwnedHexes, listDemoMarketplace, type DemoHex } from "@/lib/demo-storage";
import { money } from "@/lib/utils";

export function DemoMarketplace() {
  const [localListings, setLocalListings] = useState<DemoHex[]>([]);
  const [ownedIndexes, setOwnedIndexes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = () => {
      setLocalListings(listDemoMarketplace());
      setOwnedIndexes(new Set(getDemoOwnedHexes().filter((hex) => hex.ownerId === DEMO_USER.id).map((hex) => hex.h3Index)));
    };
    refresh();
    window.addEventListener(DEMO_STORAGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DEMO_STORAGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function buyListing(listing: (typeof demoListings)[number]) {
    const [latitude, longitude] = cellToLatLng(listing.h3Index);
    buyDemoHex({
      h3Index: listing.h3Index,
      latitude,
      longitude,
      priceCents: listing.priceCents,
      message: listing.message
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm uppercase tracking-wide text-secondary">Demo marketplace</p><h1 className="text-3xl font-semibold">Local hex listings</h1><p className="mt-2 text-muted-foreground">Purchases and listings stay in this browser.</p></div>
        <Button asChild><Link href="/">Browse map</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoListings.map((listing) => {
          const owned = ownedIndexes.has(listing.h3Index);
          return <Card key={listing.id}><CardHeader><CardTitle className="break-all text-base">{listing.h3Index}</CardTitle></CardHeader><CardContent>
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{listing.ownerName}</span><span className="font-semibold text-secondary">{money(listing.priceCents)}</span></div>
            <p className="mt-3 text-sm text-muted-foreground">{listing.message}</p>
            <Button className="mt-4 w-full" disabled={owned} onClick={() => buyListing(listing)}>{owned ? <CheckCircle2 className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}{owned ? "Owned by Demo User" : "Buy locally"}</Button>
          </CardContent></Card>;
        })}
        {localListings.map((hex) => <Card key={`local-${hex.h3Index}`} className="border-emerald-400/30"><CardHeader><CardTitle className="break-all text-base">{hex.h3Index}</CardTitle></CardHeader><CardContent>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Listed by {DEMO_USER.name}</span><span className="font-semibold text-secondary">{money(hex.salePriceCents ?? hex.priceCents)}</span></div>
          {hex.message ? <p className="mt-3 text-sm text-muted-foreground">{hex.message}</p> : null}
          {hex.imageUrl ? <img src={hex.imageUrl} alt="Listed hex" className="mt-3 aspect-video w-full rounded-md object-cover" /> : null}
          <Button className="mt-4 w-full" variant="outline" disabled>Your local listing</Button>
        </CardContent></Card>)}
      </div>
    </div>
  );
}
