"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Link2, LockKeyhole, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectedComponents, CUSTOM_TERRITORY_HEX_REQUIREMENT } from "@/lib/territory";

type TerritoryHex = {
  id: string;
  h3Index: string;
  priceCents: number;
};

export function TerritoryForm({ hexes }: { hexes: TerritoryHex[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const ownedComponents = useMemo(
    () => connectedComponents(hexes.map((hex) => hex.h3Index)),
    [hexes]
  );
  const largestOwnedComponent = ownedComponents[0] ?? [];
  const isUnlocked = largestOwnedComponent.length >= CUSTOM_TERRITORY_HEX_REQUIREMENT;
  const selectedHexes = useMemo(
    () => hexes.filter((hex) => selectedIds.includes(hex.id)),
    [hexes, selectedIds]
  );
  const components = useMemo(
    () => connectedComponents(selectedHexes.map((hex) => hex.h3Index)),
    [selectedHexes]
  );
  const isConnected = selectedHexes.length >= CUSTOM_TERRITORY_HEX_REQUIREMENT && components.length === 1;
  const totalValueCents = selectedHexes.reduce((sum, hex) => sum + hex.priceCents, 0);

  function toggleHex(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
    setMessage(null);
  }

  function selectLargestComponent() {
    const indexes = new Set(largestOwnedComponent.slice(0, 5000));
    setSelectedIds(hexes.filter((hex) => indexes.has(hex.h3Index)).map((hex) => hex.id));
    setMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!isConnected) {
      setMessage(`Select at least ${CUSTOM_TERRITORY_HEX_REQUIREMENT} connected owned hexes.`);
      return;
    }
    const response = await fetch("/api/territories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        flag: String(form.get("flag")),
        description: String(form.get("description") ?? ""),
        bannerImageUrl: String(form.get("bannerImageUrl") || "") || null,
        flagImageUrl: String(form.get("flagImageUrl") || "") || null,
        color: String(form.get("color")),
        hexIds: selectedIds
      })
    });
    const data = await response.json();
    setMessage(response.ok ? "Territory created." : data.error || "Territory could not be created.");
    if (response.ok) {
      setSelectedIds([]);
      event.currentTarget.reset();
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className={`rounded-md border p-3 ${isUnlocked ? "border-emerald-400/35 bg-emerald-500/10" : "border-border bg-muted/30"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isUnlocked ? <Sparkles className="h-4 w-4 text-emerald-400" /> : <LockKeyhole className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-semibold">Village territory</span>
          </div>
          <span className="text-sm font-semibold">{Math.min(largestOwnedComponent.length, CUSTOM_TERRITORY_HEX_REQUIREMENT)} / {CUSTOM_TERRITORY_HEX_REQUIREMENT} connected</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-background/70">
          <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (largestOwnedComponent.length / CUSTOM_TERRITORY_HEX_REQUIREMENT) * 100)}%` }} />
        </div>
        {isUnlocked ? (
          <Button className="mt-3" size="sm" type="button" variant="outline" onClick={selectLargestComponent}>
            <Link2 className="h-4 w-4" /> Select connected group
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-[80px_1fr_120px]">
        <div className="space-y-1.5">
          <Label>Flag</Label>
          <Input name="flag" defaultValue="🏳️" maxLength={16} required disabled={!isUnlocked} />
        </div>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input name="name" required disabled={!isUnlocked} />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <Input name="color" type="color" defaultValue="#22c55e" disabled={!isUnlocked} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input name="description" maxLength={240} disabled={!isUnlocked} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5"><Label>Banner image URL</Label><Input name="bannerImageUrl" type="url" disabled={!isUnlocked} /></div>
        <div className="space-y-1.5"><Label>Flag image URL</Label><Input name="flagImageUrl" type="url" disabled={!isUnlocked} /></div>
      </div>
      <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-border p-3">
        {hexes.length ? (
          hexes.map((hex) => (
            <label key={hex.id} className="flex items-center gap-2 text-sm">
              <input
                checked={selectedIds.includes(hex.id)}
                type="checkbox"
                disabled={!isUnlocked}
                onChange={() => toggleHex(hex.id)}
              />
              <span className="break-all">{hex.h3Index}</span>
            </label>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Purchase adjacent hexes to create a territory.</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
        <div>
          <p className="text-muted-foreground">Selected</p>
          <p className="font-semibold">{selectedHexes.length} hexes</p>
        </div>
        <div>
          <p className="text-muted-foreground">Value</p>
          <p className="font-semibold">${(totalValueCents / 100).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Connectivity</p>
          <p className={`flex items-center gap-1 font-semibold ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
            {isConnected ? <CheckCircle2 className="h-4 w-4" /> : selectedHexes.length ? <XCircle className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {isConnected ? "Connected" : selectedHexes.length ? `${components.length} groups` : "None"}
          </p>
        </div>
      </div>
      <Button disabled={!isConnected}>{isUnlocked ? "Create Village" : "Village locked"}</Button>
      {message ? <span className="ml-3 text-sm text-muted-foreground">{message}</span> : null}
    </form>
  );
}
