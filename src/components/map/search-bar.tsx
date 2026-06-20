"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMapStore } from "@/stores/map-store";
import { isClientDemoMode, DEMO_USER } from "@/lib/demo";
import { searchDemo } from "@/lib/demo-storage";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setSelectedHex = useMapStore((state) => state.setSelectedHex);
  const focusMap = useMapStore((state) => state.focusMap);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (isClientDemoMode) {
      const result = searchDemo(query)[0];
      if (!result) {
        setError("No demo result found.");
        return;
      }
      const hex = result.hex;
      setSelectedHex({
        h3Index: result.h3Index,
        lng: result.longitude,
        lat: result.latitude,
        purchased: hex ? {
          id: hex.id,
          ownerName: hex.ownerName,
          ownerImage: hex.avatarUrl,
          title: hex.title,
          message: result.territory?.description || hex.message,
          imageUrl: result.territory?.bannerImageUrl || result.territory?.flagImageUrl || hex.imageUrl,
          externalLink: hex.externalLink,
          status: hex.ownerId === DEMO_USER.id ? "MY_OWNED" : hex.forSale ? "FOR_SALE" : "OWNED",
          priceCents: hex.salePriceCents ?? hex.priceCents
        } : undefined
      });
      focusMap(result.longitude, result.latitude);
      return;
    }
    const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const params = coordinateMatch
      ? `lng=${coordinateMatch[1]}&lat=${coordinateMatch[2]}`
      : `q=${encodeURIComponent(query)}`;
    const response = await fetch(`/api/search?${params}`);
    const data = await response.json();
    const feature = data.results?.[0];
    if (feature) {
      setSelectedHex({
        h3Index: feature.properties.h3Index,
        lng: feature.properties.longitude,
        lat: feature.properties.latitude,
        purchased: {
          id: feature.properties.id,
          ownerName: feature.properties.ownerName,
          ownerImage: feature.properties.ownerImage,
          ownerFounderNumber: feature.properties.ownerFounderNumber,
          ownerKingdomUnlocked: feature.properties.ownerKingdomUnlocked,
          title: feature.properties.title,
          message: feature.properties.message,
          imageUrl: feature.properties.imageUrl,
          externalLink: feature.properties.externalLink,
          status: feature.properties.status,
          priceCents: feature.properties.priceCents
        }
      });
      focusMap(feature.properties.longitude, feature.properties.latitude);
    } else if (data.h3Index && coordinateMatch) {
      setSelectedHex({
        h3Index: data.h3Index,
        lng: Number(coordinateMatch[1]),
        lat: Number(coordinateMatch[2])
      });
      focusMap(Number(coordinateMatch[1]), Number(coordinateMatch[2]));
    } else {
      setError("No result found.");
    }
  }

  return (
    <form onSubmit={submit} className="absolute left-4 top-4 z-20 flex w-[min(460px,calc(100vw-2rem))] flex-wrap gap-2 rounded-lg border border-border bg-card/95 p-2 shadow-xl backdrop-blur">
      <Input className="min-w-0 flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hex, lng,lat, Demo User, or kingdom" />
      <Button type="submit" size="icon" aria-label="Search"><Search className="h-4 w-4" /></Button>
      {error ? <p className="w-full px-1 text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
