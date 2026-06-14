"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMapStore } from "@/stores/map-store";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const setSelectedHex = useMapStore((state) => state.setSelectedHex);

  async function submit(event: FormEvent) {
    event.preventDefault();
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
          message: feature.properties.message,
          imageUrl: feature.properties.imageUrl,
          status: feature.properties.status,
          priceCents: feature.properties.priceCents
        }
      });
    } else if (data.h3Index && coordinateMatch) {
      setSelectedHex({
        h3Index: data.h3Index,
        lng: Number(coordinateMatch[1]),
        lat: Number(coordinateMatch[2])
      });
    }
  }

  return (
    <form onSubmit={submit} className="absolute left-4 top-4 z-20 flex w-[min(460px,calc(100vw-2rem))] gap-2 rounded-lg border border-border bg-card/95 p-2 shadow-xl backdrop-blur">
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username, hex ID, or lng, lat" />
      <Button type="submit" size="icon" aria-label="Search"><Search className="h-4 w-4" /></Button>
    </form>
  );
}
