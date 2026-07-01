"use client";

import { FormEvent, useEffect, useState } from "react";
import { isValidCell } from "h3-js";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMapStore } from "@/stores/map-store";
import { isClientDemoMode, DEMO_USER } from "@/lib/demo";
import { searchDemo, type DemoSearchResult } from "@/lib/demo-storage";

type SearchResult = {
  type: "hex" | "user" | "geocode";
  label: string;
  latitude: number;
  longitude: number;
  zoom: number;
  h3Index?: string;
  bbox?: [number, number, number, number];
  properties?: Record<string, string | number | boolean | null>;
};

function resultFromDemo(result: DemoSearchResult): SearchResult {
  const hex = result.hex;
  return {
    type: result.type,
    label: result.label,
    h3Index: result.h3Index,
    latitude: result.latitude,
    longitude: result.longitude,
    zoom: result.type === "hex" ? 13 : 9,
    properties: hex ? {
      id: hex.id,
      ownerName: hex.ownerName,
      ownerImage: hex.avatarUrl,
      title: hex.title,
      message: hex.message,
      imageUrl: hex.imageUrl,
      externalLink: hex.externalLink,
      status: hex.ownerId === DEMO_USER.id ? "MY_OWNED" : "OWNED",
      priceCents: hex.priceCents
    } : undefined
  };
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSelectedHex = useMapStore((state) => state.setSelectedHex);
  const focusMap = useMapStore((state) => state.focusMap);

  useEffect(() => {
    const closeSuggestions = () => {
      setResults([]);
      setError(null);
      setActiveLabel(null);
    };
    window.addEventListener("pixel-earth:claim-first-hex", closeSuggestions);
    return () => window.removeEventListener("pixel-earth:claim-first-hex", closeSuggestions);
  }, []);

  function selectResult(result: SearchResult) {
    const properties = result.properties;
    if (result.type === "hex" && result.h3Index) {
      setSelectedHex({
        h3Index: result.h3Index,
        lng: result.longitude,
        lat: result.latitude,
        purchased: properties && properties.status !== "AVAILABLE" ? {
          id: String(properties.id ?? result.h3Index),
          ownerName: String(properties.ownerName ?? "Anonymous owner"),
          ownerImage: properties.ownerImage ? String(properties.ownerImage) : null,
          ownerFounderNumber: properties.ownerFounderNumber ? Number(properties.ownerFounderNumber) : null,
          ownerKingdomUnlocked: Boolean(properties.ownerKingdomUnlocked),
          title: properties.title ? String(properties.title) : "",
          message: properties.message ? String(properties.message) : "",
          imageUrl: properties.imageUrl ? String(properties.imageUrl) : null,
          externalLink: properties.externalLink ? String(properties.externalLink) : null,
          status: properties.status ? String(properties.status) : "OWNED",
          priceCents: Number(properties.priceCents ?? 100)
        } : undefined
      });
    } else {
      setSelectedHex(null);
    }

    focusMap(result.longitude, result.latitude, {
      zoom: result.zoom,
      bbox: result.bbox,
      label: result.label
    });
    setActiveLabel(result.label);
    setResults([]);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    setError(null);
    setResults([]);
    if (!normalized) {
      setError("Enter a hex, player, country, city, or coordinates.");
      return;
    }

    const coordinateQuery = /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(normalized);
    if (isClientDemoMode) {
      const demoResults = searchDemo(normalized).map(resultFromDemo);
      if (demoResults.length) {
        if (isValidCell(normalized) || coordinateQuery || demoResults.length === 1) selectResult(demoResults[0]);
        else setResults(demoResults);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Search request failed.");
      const data = (await response.json()) as { results?: SearchResult[] };
      const nextResults = data.results ?? [];
      if (!nextResults.length) {
        setError("No results found.");
      } else if (isValidCell(normalized) || coordinateQuery || nextResults.length === 1) {
        selectResult(nextResults[0]);
      } else {
        setResults(nextResults);
      }
    } catch {
      setError("Search is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute left-3 right-3 top-3 z-20 md:left-4 md:right-auto md:top-4 md:w-[min(500px,calc(100vw-2rem))]">
      <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-lg border border-border bg-[#0b1117] p-2 shadow-xl">
        <Input id="map-search-input" className="min-w-0 flex-1 text-base md:text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a place or hex" aria-label="Search the world map" />
        <Button type="submit" size="icon" aria-label="Search" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        {activeLabel && !error ? <p className="flex w-full items-center gap-1.5 px-1 text-xs text-cyan-200"><MapPin className="h-3.5 w-3.5" />{activeLabel}</p> : null}
        {error ? <p className="w-full px-1 text-xs text-destructive">{error}</p> : null}
      </form>

      {results.length ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-[#0b1117] shadow-2xl">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.label}-${index}`}
              type="button"
              className="flex w-full items-start gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent"
              onClick={() => selectResult(result)}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <span className="min-w-0"><span className="block text-sm font-medium">{result.label}</span><span className="mt-0.5 block text-xs capitalize text-muted-foreground">{result.type === "geocode" ? "OpenStreetMap place" : result.type}</span></span>
            </button>
          ))}
          {results.some((result) => result.type === "geocode") ? <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">Search data © OpenStreetMap contributors</p> : null}
        </div>
      ) : null}
    </div>
  );
}
