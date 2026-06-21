"use client";

import { useEffect, useState } from "react";
import { cellToLatLng } from "h3-js";
import { Loader2, ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { isClientDemoMode } from "@/lib/demo";
import { buyDemoHex, getDemoOwnedHexes } from "@/lib/demo-storage";
import { redirectToSignIn } from "@/lib/client-auth";

export function BuyListingButton({ h3Index, priceCents = 100 }: { h3Index: string; priceCents?: number }) {
  const { status: authenticationStatus } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState(false);

  useEffect(() => {
    if (isClientDemoMode) setOwned(getDemoOwnedHexes().some((hex) => hex.h3Index === h3Index));
  }, [h3Index]);

  async function buy() {
    setBusy(true);
    setError(null);
    if (!isClientDemoMode && authenticationStatus !== "authenticated") {
      redirectToSignIn(`${window.location.pathname}${window.location.search}`);
      return;
    }
    if (isClientDemoMode) {
      if (getDemoOwnedHexes().some((hex) => hex.h3Index === h3Index)) {
        setOwned(true);
        setBusy(false);
        return;
      }
      try {
        const [latitude, longitude] = cellToLatLng(h3Index);
        buyDemoHex({
          h3Index,
          latitude,
          longitude,
          message: "Purchased from the demo marketplace.",
          avatarUrl: null,
          imageUrl: null,
          priceCents
        });
        setOwned(true);
      } catch {
        setError("This demo listing could not be purchased.");
      }
      setBusy(false);
      return;
    }
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ h3Index, message: "" })
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Checkout could not be started.");
      return;
    }

    window.location.href = data.checkoutUrl;
  }

  return (
    <div className="mt-4 space-y-2">
      <Button className="w-full" onClick={buy} disabled={busy || owned}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        {busy ? "Starting checkout..." : owned ? "Owned by Demo User" : "Buy now"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
