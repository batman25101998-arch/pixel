"use client";

import { useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BuyListingButton({ h3Index }: { h3Index: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
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
      <Button className="w-full" onClick={buy} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        {busy ? "Starting checkout..." : "Buy now"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
