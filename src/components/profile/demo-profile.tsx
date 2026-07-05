"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEMO_USER } from "@/lib/demo";
import { DEMO_STORAGE_EVENT, getDemoOwnedHexes, type DemoHex } from "@/lib/demo-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DemoProfile() {
  const [hexes, setHexes] = useState<DemoHex[]>([]);

  useEffect(() => {
    const load = () => setHexes(getDemoOwnedHexes().filter((hex) => hex.ownerId === DEMO_USER.id));
    load();
    window.addEventListener(DEMO_STORAGE_EVENT, load);
    return () => window.removeEventListener(DEMO_STORAGE_EVENT, load);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">{DEMO_USER.name}</h1><p className="text-muted-foreground">Permanent hex collection</p></div>
        <Button asChild><Link href="/">Browse map</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>{hexes.length} owned hexes</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hexes.length ? hexes.map((hex) => (
            <div key={hex.id} className="overflow-hidden rounded-md border border-border">
              {hex.imageUrl ? <img src={hex.imageUrl} alt="" className="aspect-video w-full object-cover" /> : null}
              <div className="space-y-3 p-3">
                <div><p className="break-all text-sm font-medium">{hex.title || hex.h3Index}</p>{hex.message ? <p className="mt-1 text-sm text-muted-foreground">{hex.message}</p> : null}</div>
                <Button asChild size="sm" variant="outline"><Link href={`/?focusHex=${encodeURIComponent(hex.h3Index)}`}>View on Map</Link></Button>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No hexes owned yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
