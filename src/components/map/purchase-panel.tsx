"use client";

import { useEffect, useMemo, useState } from "react";
import { gridDisk } from "h3-js";
import { Award, CheckCircle2, Loader2, MapPin, ShoppingCart, Tag, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FounderBadge } from "@/components/founder-badge";
import { KingdomBadge } from "@/components/kingdom-badge";
import { GamificationBadges } from "@/components/gamification-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/utils";
import { DEMO_USER, isClientDemoMode } from "@/lib/demo";
import { buyDemoHex, getDemoOwnedHexes, updateDemoHexMetadata } from "@/lib/demo-storage";
import { getUserBadges } from "@/lib/gamification";
import { useMapStore } from "@/stores/map-store";

type Certificate = {
  id: string;
  h3Index: string;
  latitude: number;
  longitude: number;
  ownerName: string;
  ownerImage?: string | null;
  ownerFounderNumber?: number | null;
  ownerKingdomUnlocked?: boolean;
  adjacentOwnedCount?: number;
  title?: string;
  message?: string;
  imageUrl?: string | null;
  externalLink?: string | null;
  priceCents: number;
  purchaseDate: string;
};

type CheckoutStatusResponse = {
  status: "REQUIRES_PAYMENT" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELED" | "PENDING";
  certificate: Certificate | null;
};

function coordinateLabel(lat: number, lng: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lng).toFixed(5)}° ${ew}`;
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  return (
    <div className="rounded-lg border border-amber-300/45 bg-gradient-to-br from-amber-50 to-stone-100 p-4 text-stone-900 shadow-inner">
      <div className="flex items-start justify-between gap-3 border-b border-stone-300 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Certificate of Ownership</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold">{certificate.ownerName}</h3>
            <FounderBadge founderNumber={certificate.ownerFounderNumber} />
            <KingdomBadge unlocked={certificate.ownerKingdomUnlocked} />
          </div>
        </div>
        <Award className="h-9 w-9 text-amber-600" />
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <p>
          owns Earth hex <span className="font-semibold">{certificate.h3Index}</span>
        </p>
        <p>{coordinateLabel(certificate.latitude, certificate.longitude)}</p>
        <p>Purchased {new Date(certificate.purchaseDate).toLocaleDateString()}</p>
        <p>Certificate #{certificate.id.slice(0, 8).toUpperCase()}</p>
      </div>
      {certificate.ownerImage ? <img src={certificate.ownerImage} alt="Owner avatar" className="mt-4 h-12 w-12 rounded-full object-cover" /> : null}
      {certificate.imageUrl ? <img src={certificate.imageUrl} alt="Hex preview" className="mt-4 aspect-video w-full rounded-md object-cover" /> : null}
      {certificate.externalLink ? <a href={certificate.externalLink} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-medium text-blue-700 underline">Visit collectible link</a> : null}
      {certificate.message ? <p className="mt-4 rounded-md bg-white/60 p-3 text-sm italic text-stone-700">"{certificate.message}"</p> : null}
    </div>
  );
}

function MergeAnimation({ adjacentCount, onComplete }: { adjacentCount: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2200);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-black/35 backdrop-blur-sm">
      <div className="text-center">
        <div className="merge-stage" aria-hidden="true">
          <span className="merge-cell merge-cell-1" />
          <span className="merge-cell merge-cell-2" />
          <span className="merge-cell merge-cell-3" />
          <span className="merge-cell merge-cell-4" />
          <span className="merge-cell merge-cell-5" />
          <span className="merge-cell merge-cell-6" />
          <span className="merge-cell merge-cell-core" />
        </div>
        <p className="merge-label mt-3 text-sm font-semibold text-emerald-200">
          Merged with {adjacentCount} adjacent {adjacentCount === 1 ? "hex" : "hexes"}
        </p>
      </div>
    </div>
  );
}

export function PurchasePanel() {
  const selectedHex = useMapStore((state) => state.selectedHex);
  const setSelectedHex = useMapStore((state) => state.setSelectedHex);
  const refresh = useMapStore((state) => state.refresh);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [mergeCount, setMergeCount] = useState<number | null>(null);

  const purchased = selectedHex?.purchased;
  const status = purchased?.status ?? "AVAILABLE";
  const price = purchased?.priceCents ?? 100;
  const coordinates = selectedHex ? coordinateLabel(selectedHex.lat, selectedHex.lng) : "";
  const demoOwnedHexes = isClientDemoMode ? getDemoOwnedHexes().filter((hex) => hex.ownerId === DEMO_USER.id) : [];
  const demoBadges = isClientDemoMode ? getUserBadges({
    id: DEMO_USER.id,
    name: DEMO_USER.name,
    founderNumber: DEMO_USER.founderNumber,
    ownedHexes: demoOwnedHexes,
    marketplaceListings: demoOwnedHexes.filter((hex) => hex.forSale).length
  }) : [];

  const previewStyle = useMemo(() => {
    if (!selectedHex) return {};
    return {
      background:
        status === "AVAILABLE"
          ? "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.88))"
          : status === "FOR_SALE"
            ? "linear-gradient(135deg, rgba(251,191,36,0.92), rgba(180,83,9,0.85))"
            : "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(88,28,135,0.85))"
    };
  }, [selectedHex, status]);

  useEffect(() => {
    if (!selectedHex) return;
    setError(null);
    const saved = isClientDemoMode ? getDemoOwnedHexes().find((hex) => hex.h3Index === selectedHex.h3Index) : null;
    setTitle(saved?.title ?? "");
    setMessage(saved?.message ?? "");
    setAvatarUrl(saved?.avatarUrl ?? "");
    setImageUrl(saved?.imageUrl ?? "");
    setExternalLink(saved?.externalLink ?? "");
  }, [selectedHex?.h3Index]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkout !== "success" || !sessionId) return;
    const checkoutSessionId = sessionId;

    let cancelled = false;
    let attempts = 0;

    async function pollCheckout() {
      attempts += 1;
      setCheckoutStatus("Confirming payment...");
      try {
        const response = await fetch(`/api/checkout/status?sessionId=${encodeURIComponent(checkoutSessionId)}`);
        const data = (await response.json()) as CheckoutStatusResponse;

        if (cancelled) return;
        if (data.status === "SUCCEEDED" && data.certificate) {
          setCertificate(data.certificate);
          setSelectedHex({
            h3Index: data.certificate.h3Index,
            lng: data.certificate.longitude,
            lat: data.certificate.latitude,
            purchased: {
              id: data.certificate.id,
              ownerName: data.certificate.ownerName,
              ownerImage: data.certificate.ownerImage,
              ownerFounderNumber: data.certificate.ownerFounderNumber,
              ownerKingdomUnlocked: data.certificate.ownerKingdomUnlocked,
              message: data.certificate.message,
              imageUrl: data.certificate.imageUrl,
              status: "MY_OWNED",
              priceCents: data.certificate.priceCents
            }
          });
          refresh();
          if ((data.certificate.adjacentOwnedCount ?? 0) > 0) {
            setMergeCount(data.certificate.adjacentOwnedCount ?? null);
          }
          setCheckoutStatus("Payment complete");
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }

        if (["FAILED", "CANCELED", "REFUNDED"].includes(data.status)) {
          setCheckoutStatus(null);
          setError("Payment was not completed.");
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }

        if (attempts < 12) {
          window.setTimeout(pollCheckout, 1500);
        } else {
          setCheckoutStatus("Payment is still processing. The map will update when Stripe confirms it.");
        }
      } catch {
        if (!cancelled) setError("Could not verify the checkout session.");
      }
    }

    void pollCheckout();
    return () => {
      cancelled = true;
    };
  }, [refresh, setSelectedHex]);

  if (!selectedHex && !certificate && !checkoutStatus) {
    return null;
  }

  async function checkout() {
    if (!selectedHex) return;
    setBusy(true);
    setError(null);

    if (isClientDemoMode) {
      const purchaseDate = new Date().toISOString();
      const existingOwned = getDemoOwnedHexes();
      if (existingOwned.some((hex) => hex.h3Index === selectedHex.h3Index)) {
        setBusy(false);
        setError("You already own this demo hex.");
        return;
      }

      const neighborIndexes = new Set(gridDisk(selectedHex.h3Index, 1));
      neighborIndexes.delete(selectedHex.h3Index);
      const adjacentOwnedCount = existingOwned.filter((hex) => neighborIndexes.has(hex.h3Index)).length;
      const id = `demo-${selectedHex.h3Index}`;
      buyDemoHex({
        h3Index: selectedHex.h3Index,
        latitude: selectedHex.lat,
        longitude: selectedHex.lng,
        title,
        message,
        avatarUrl: avatarUrl || null,
        imageUrl: imageUrl || null,
        externalLink: externalLink || null,
        priceCents: price
      });
      const demoCertificate: Certificate = {
        id,
        h3Index: selectedHex.h3Index,
        latitude: selectedHex.lat,
        longitude: selectedHex.lng,
        ownerName: DEMO_USER.name,
        ownerImage: avatarUrl || null,
        title,
        message,
        imageUrl: imageUrl || null,
        externalLink: externalLink || null,
        priceCents: price,
        purchaseDate,
        adjacentOwnedCount
      };
      setCertificate(demoCertificate);
      setSelectedHex({
        h3Index: selectedHex.h3Index,
        lng: selectedHex.lng,
        lat: selectedHex.lat,
        purchased: {
          id,
          ownerName: DEMO_USER.name,
              ownerImage: avatarUrl || null,
              title,
              message,
              imageUrl: imageUrl || null,
              externalLink: externalLink || null,
          status: "MY_OWNED",
          priceCents: price
        }
      });
      setBusy(false);
      refresh();
      if (adjacentOwnedCount > 0) setMergeCount(adjacentOwnedCount);
      return;
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        h3Index: selectedHex.h3Index,
        title,
        message,
        avatarUrl: avatarUrl || undefined,
        imageUrl: imageUrl || undefined,
        externalLink: externalLink || undefined
      })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Checkout could not be started.");
      return;
    }
    window.location.href = data.checkoutUrl;
  }

  function saveMetadata() {
    if (!selectedHex || !isClientDemoMode) return;
    const updated = updateDemoHexMetadata(selectedHex.h3Index, {
      message,
      title,
      avatarUrl: avatarUrl || null,
      imageUrl: imageUrl || null,
      externalLink: externalLink || null
    });
    setSelectedHex({
      ...selectedHex,
      purchased: {
        id: updated.id,
        ownerName: updated.ownerName,
        ownerImage: updated.avatarUrl,
        title: updated.title,
        message: updated.message,
        imageUrl: updated.imageUrl,
        externalLink: updated.externalLink,
        status: "MY_OWNED",
        priceCents: updated.priceCents
      }
    });
    refresh();
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      {mergeCount ? <MergeAnimation adjacentCount={mergeCount} onComplete={() => setMergeCount(null)} /> : null}
      <div className="max-h-[calc(100vh-7rem)] w-[min(520px,calc(100vw-2rem))] overflow-auto rounded-lg border border-cyan-200/20 bg-card/95 p-5 shadow-2xl shadow-black/50">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected hex</p>
            <h2 className="break-all text-lg font-semibold">{selectedHex?.h3Index ?? certificate?.h3Index}</h2>
          </div>
          <button
            aria-label="Close purchase modal"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              setSelectedHex(null);
              setCertificate(null);
              setCheckoutStatus(null);
              setError(null);
              setMergeCount(null);
            }}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {checkoutStatus && !certificate ? (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-cyan-200/20 bg-background/70 p-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{checkoutStatus}</span>
          </div>
        ) : null}

        {certificate ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              {isClientDemoMode ? "Demo purchase complete. Your hex is saved in this browser." : "Payment confirmed. Your hex is now owned and saved."}
            </div>
            <CertificateCard certificate={certificate} />
          </div>
        ) : selectedHex ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <div className="flex aspect-square items-center justify-center rounded-lg border border-cyan-200/20 bg-background/60">
                <div className="mock-legend-hex h-24 w-24 border border-white/25 shadow-lg shadow-cyan-950/40" style={previewStyle} />
              </div>
              <div className="space-y-3 rounded-lg border border-border bg-background/55 p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Coordinates</p>
                  <p className="mt-1 flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    {coordinates}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Price</p>
                  <p className="mt-1 text-2xl font-bold">{money(price)}</p>
                </div>
              </div>
            </div>

            {purchased ? (
              <div className="space-y-3 rounded-md border border-border bg-background/60 p-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={purchased.ownerImage ?? undefined} />
                    <AvatarFallback>{purchased.ownerName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{purchased.ownerName}</p>
                      <FounderBadge founderNumber={purchased.ownerFounderNumber} compact />
                      <KingdomBadge unlocked={purchased.ownerKingdomUnlocked} compact />
                    </div>
                    <p className="text-xs text-muted-foreground">{status === "FOR_SALE" ? "Listed for resale" : "Owned"}</p>
                  </div>
                </div>
                {isClientDemoMode && status === "MY_OWNED" ? <GamificationBadges badges={demoBadges} compact /> : null}
                {purchased.title ? <h3 className="text-lg font-semibold">{purchased.title}</h3> : null}
                {purchased.message ? <p className="mt-3 text-sm text-muted-foreground">{purchased.message}</p> : null}
                {purchased.imageUrl ? <img src={purchased.imageUrl} alt="" className="mt-3 aspect-video w-full rounded-md object-cover" /> : null}
                {purchased.externalLink ? <a href={purchased.externalLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">Visit link</a> : null}
                {isClientDemoMode && status === "MY_OWNED" ? (
                  <div className="space-y-3 border-t border-border pt-3">
                    <div className="space-y-1.5"><Label htmlFor="owned-title">Title</Label><Input id="owned-title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
                    <div className="space-y-1.5"><Label htmlFor="owned-message">Message</Label><Textarea id="owned-message" maxLength={240} value={message} onChange={(event) => setMessage(event.target.value)} /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label htmlFor="owned-avatar">Avatar URL</Label><Input id="owned-avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></div>
                      <div className="space-y-1.5"><Label htmlFor="owned-image">Image URL</Label><Input id="owned-image" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></div>
                    </div>
                    <div className="space-y-1.5"><Label htmlFor="owned-link">External link</Label><Input id="owned-link" type="url" value={externalLink} onChange={(event) => setExternalLink(event.target.value)} /></div>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar preview" className="h-12 w-12 rounded-full object-cover" /> : null}
                    {imageUrl ? <img src={imageUrl} alt="Image preview" className="aspect-video w-full rounded-md object-cover" /> : null}
                    <Button type="button" variant="outline" className="w-full" onClick={saveMetadata}>Save demo details</Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5"><Label htmlFor="title">Title</Label><Input id="title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name this collectible" /></div>
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
                <div className="space-y-1.5"><Label htmlFor="external-link">External link</Label><Input id="external-link" type="url" value={externalLink} onChange={(event) => setExternalLink(event.target.value)} placeholder="https://..." /></div>
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {purchased && status !== "FOR_SALE" && status !== "AVAILABLE" ? (
              <p className="text-sm text-muted-foreground">This hex is already claimed. Watch the marketplace for resale listings.</p>
            ) : (
              <Button className="w-full" onClick={checkout} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : purchased ? <Tag className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                {busy ? "Starting checkout..." : purchased ? "Buy resale hex" : "Buy hex for $1"}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
