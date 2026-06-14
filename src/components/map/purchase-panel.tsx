"use client";

import { useState } from "react";
import { ShoppingCart, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { money } from "@/lib/utils";
import { useMapStore } from "@/stores/map-store";

export function PurchasePanel() {
  const selectedHex = useMapStore((state) => state.selectedHex);
  const refresh = useMapStore((state) => state.refresh);
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedHex) {
    return (
      <aside className="absolute bottom-4 right-4 z-20 w-[min(380px,calc(100vw-2rem))] rounded-lg border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
        <p className="text-sm text-muted-foreground">Click any place on Earth to inspect or buy the hex beneath it.</p>
      </aside>
    );
  }

  const purchased = selectedHex.purchased;
  const status = purchased?.status ?? "AVAILABLE";
  const price = purchased?.priceCents ?? 100;

  async function checkout() {
    if (!selectedHex) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        h3Index: selectedHex.h3Index,
        message,
        avatarUrl: avatarUrl || undefined,
        imageUrl: imageUrl || undefined
      })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Checkout could not be started.");
      return;
    }
    refresh();
    window.location.href = data.checkoutUrl;
  }

  return (
    <aside className="absolute bottom-4 right-4 z-20 max-h-[calc(100vh-6.5rem)] w-[min(420px,calc(100vw-2rem))] overflow-auto rounded-lg border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected hex</p>
          <h2 className="break-all text-lg font-semibold">{selectedHex.h3Index}</h2>
        </div>
        <span className="rounded-md bg-secondary px-2 py-1 text-sm font-semibold text-secondary-foreground">{money(price)}</span>
      </div>

      {purchased ? (
        <div className="mb-4 rounded-md border border-border bg-background/60 p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={purchased.ownerImage ?? undefined} />
              <AvatarFallback>{purchased.ownerName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{purchased.ownerName}</p>
              <p className="text-xs text-muted-foreground">{status === "FOR_SALE" ? "Listed for resale" : status === "AVAILABLE" ? "Available" : "Owned"}</p>
            </div>
          </div>
          {purchased.message ? <p className="mt-3 text-sm text-muted-foreground">{purchased.message}</p> : null}
          {purchased.imageUrl ? <img src={purchased.imageUrl} alt="" className="mt-3 aspect-video w-full rounded-md object-cover" /> : null}
        </div>
      ) : null}

      {purchased && status !== "FOR_SALE" && status !== "AVAILABLE" ? (
        <p className="text-sm text-muted-foreground">This hex is already claimed. Watch the marketplace for resale listings.</p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" maxLength={240} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Leave a marker for future explorers." />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image">Image URL</Label>
              <Input id="image" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{typeof error === "string" ? error : "Something went wrong."}</p> : null}
          <Button className="w-full" onClick={checkout} disabled={busy}>
            {purchased ? <Tag className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {busy ? "Starting checkout..." : purchased ? "Buy resale hex" : "Buy this hex for $1"}
          </Button>
        </div>
      )}
    </aside>
  );
}
