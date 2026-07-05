"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Award, CheckCircle2, ImageUp, Loader2, MapPin, ShoppingCart, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HexImageUpload } from "@/components/hex-image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/utils";
import { DEMO_USER, isClientDemoMode } from "@/lib/demo";
import { buyDemoHex, getDemoOwnedHexes, updateDemoHexMetadata } from "@/lib/demo-storage";
import { redirectToSignIn } from "@/lib/client-auth";
import { apiErrorMessage } from "@/lib/api-error";
import { useMapStore } from "@/stores/map-store";

type Certificate = {
  id: string;
  h3Index: string;
  latitude: number;
  longitude: number;
  ownerName: string;
  ownerImage?: string | null;
  avatarUrl?: string | null;
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

export function PurchasePanel() {
  const { status: authenticationStatus } = useSession();
  const selectedHex = useMapStore((state) => state.selectedHex);
  const setSelectedHex = useMapStore((state) => state.setSelectedHex);
  const refresh = useMapStore((state) => state.refresh);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const touchStartY = useRef<number | null>(null);
  const purchaseImageInputRef = useRef<HTMLInputElement | null>(null);
  const [purchaseImage, setPurchaseImage] = useState<File | null>(null);
  const [purchaseImagePreview, setPurchaseImagePreview] = useState<string | null>(null);

  const purchased = selectedHex?.purchased;
  const status = purchased?.status ?? "AVAILABLE";
  const isOwnHex = status === "MY_OWNED";
  const price = purchased?.priceCents ?? 100;
  const coordinates = selectedHex ? coordinateLabel(selectedHex.lat, selectedHex.lng) : "";

  const previewStyle = useMemo(() => {
    if (!selectedHex) return {};
    return {
      background:
        status === "AVAILABLE"
          ? "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.88))"
          : "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(88,28,135,0.85))"
    };
  }, [selectedHex, status]);

  useEffect(() => {
    if (!selectedHex) return;
    setError(null);
    setPurchaseStep(null);
    setPurchaseImage(null);
    setPurchaseImagePreview(null);
    if (purchaseImageInputRef.current) purchaseImageInputRef.current.value = "";
    const saved = isClientDemoMode ? getDemoOwnedHexes().find((hex) => hex.h3Index === selectedHex.h3Index) : null;
    setTitle(saved?.title ?? selectedHex.purchased?.title ?? "");
    setMessage(saved?.message ?? selectedHex.purchased?.message ?? "");
    setAvatarUrl(saved?.avatarUrl ?? selectedHex.purchased?.avatarUrl ?? "");
    setImageUrl(saved?.imageUrl ?? selectedHex.purchased?.imageUrl ?? "");
    setExternalLink(saved?.externalLink ?? selectedHex.purchased?.externalLink ?? "");
  }, [selectedHex]);

  useEffect(() => {
    return () => {
      if (purchaseImagePreview) URL.revokeObjectURL(purchaseImagePreview);
    };
  }, [purchaseImagePreview]);

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
      setCheckoutStatus("Saving forever...");
      try {
        const response = await fetch(`/api/checkout/status?sessionId=${encodeURIComponent(checkoutSessionId)}`);
        const data = (await response.json()) as CheckoutStatusResponse;

        if (cancelled) return;
        if (data.status === "SUCCEEDED" && data.certificate) {
          const confirmedCertificate = data.certificate;
          setCertificate(confirmedCertificate);
          setSelectedHex({
            h3Index: confirmedCertificate.h3Index,
            lng: confirmedCertificate.longitude,
            lat: confirmedCertificate.latitude,
            purchased: {
              id: confirmedCertificate.id,
              ownerName: confirmedCertificate.ownerName,
              ownerImage: confirmedCertificate.ownerImage,
              avatarUrl: confirmedCertificate.avatarUrl,
              ownerFounderNumber: confirmedCertificate.ownerFounderNumber,
              ownerKingdomUnlocked: confirmedCertificate.ownerKingdomUnlocked,
              message: confirmedCertificate.message,
              imageUrl: confirmedCertificate.imageUrl,
              status: "MY_OWNED",
              priceCents: confirmedCertificate.priceCents,
              purchaseDate: confirmedCertificate.purchaseDate
            }
          });
          refresh();
          setCheckoutStatus("Payment complete");
          setPurchaseStep(null);
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
    setPurchaseStep(purchaseImage ? "Uploading image..." : "Creating your hex...");

    if (!isClientDemoMode && authenticationStatus !== "authenticated") {
      const callbackUrl = new URL(window.location.href);
      callbackUrl.searchParams.set("hex", selectedHex.h3Index);
      redirectToSignIn(`${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
      return;
    }

    if (isClientDemoMode) {
      const purchaseDate = new Date().toISOString();
      const existingOwned = getDemoOwnedHexes();
      if (existingOwned.some((hex) => hex.h3Index === selectedHex.h3Index)) {
        setBusy(false);
        setPurchaseStep(null);
        setError("You already own this demo hex.");
        return;
      }

      const id = `demo-${selectedHex.h3Index}`;
      setPurchaseStep("Creating your hex...");
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
        purchaseDate
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
              avatarUrl: avatarUrl || null,
              title,
              message,
              imageUrl: imageUrl || null,
              externalLink: externalLink || null,
          status: "MY_OWNED",
          priceCents: price,
          purchaseDate
        }
      });
      setBusy(false);
      setPurchaseStep(null);
      refresh();
      return;
    }

    let checkoutImageUrl = imageUrl || undefined;
    if (purchaseImage) {
      const formData = new FormData();
      formData.set("h3Index", selectedHex.h3Index);
      formData.set("file", purchaseImage);
      try {
        const uploadResponse = await fetch("/api/upload/hex-image", { method: "POST", body: formData });
        const uploadData = (await uploadResponse.json()) as { imageUrl?: string; error?: string };
        console.info("[purchase-image] upload API response", uploadResponse.status, uploadData);
        if (!uploadResponse.ok || !uploadData.imageUrl) throw new Error(uploadData.error ?? "Image could not be uploaded.");
        checkoutImageUrl = uploadData.imageUrl;
        console.info("[purchase-image] blob URL", checkoutImageUrl);
        setPurchaseStep("Creating your hex...");
      } catch (uploadError) {
        setBusy(false);
        setPurchaseStep(null);
        setError(uploadError instanceof Error ? uploadError.message : "Image could not be uploaded before checkout.");
        return;
      }
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        h3Index: selectedHex.h3Index,
        title,
        message,
        avatarUrl: avatarUrl || undefined,
        imageUrl: checkoutImageUrl,
        externalLink: externalLink || undefined
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setBusy(false);
      setPurchaseStep(null);
      setError(typeof data.error === "string" ? data.error : "Checkout could not be started.");
      return;
    }
    setPurchaseStep("Saving forever...");
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    window.location.href = data.checkoutUrl;
  }

  async function saveMetadata() {
    if (!selectedHex?.purchased || !isOwnHex) return;
    setBusy(true);
    setError(null);
    try {
      if (isClientDemoMode) {
        updateDemoHexMetadata(selectedHex.h3Index, {
          message,
          title,
          avatarUrl: avatarUrl || null,
          imageUrl: imageUrl || null,
          externalLink: externalLink || null
        });
      } else {
        const response = await fetch(`/api/hexes/${selectedHex.purchased.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            title,
            avatarUrl: avatarUrl || null,
            imageUrl: imageUrl || null,
            externalLink: externalLink || null
          })
        });
        const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
        if (!response.ok) {
          throw new Error(apiErrorMessage(data, `Hex details could not be saved (${response.status}).`));
        }
      }

      setSelectedHex({
        ...selectedHex,
        purchased: {
          ...selectedHex.purchased,
          ownerImage: avatarUrl || null,
          avatarUrl: avatarUrl || null,
          title,
          message,
          imageUrl: imageUrl || null,
          externalLink: externalLink || null
        }
      });
      refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Hex details could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function applyUploadedImage(nextImageUrl: string | null) {
    setImageUrl(nextImageUrl ?? "");
    if (selectedHex?.purchased) {
      setSelectedHex({
        ...selectedHex,
        purchased: { ...selectedHex.purchased, imageUrl: nextImageUrl }
      });
    }
    setCertificate((current) => current ? { ...current, imageUrl: nextImageUrl } : current);
    refresh();
  }

  function choosePurchaseImage(file?: File) {
    setPurchaseImage(null);
    setPurchaseImagePreview(null);
    setError(null);
    if (!file) return;
    console.info("[purchase-image] selected file", file.name);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }
    setPurchaseImage(file);
    setPurchaseImagePreview(URL.createObjectURL(file));
  }

  function closePanel() {
    setSelectedHex(null);
    setCertificate(null);
    setCheckoutStatus(null);
    setPurchaseStep(null);
    setError(null);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/25 md:items-center md:bg-black/45 md:p-4 md:backdrop-blur-sm">
      <div
        className="max-h-[84dvh] w-full overflow-y-auto overscroll-contain rounded-t-xl border border-b-0 border-cyan-200/20 bg-[#0b1117] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 md:max-h-[calc(100vh-7rem)] md:w-[min(520px,calc(100vw-2rem))] md:rounded-lg md:border-b"
        onTouchStart={(event) => {
          touchStartY.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const startY = touchStartY.current;
          touchStartY.current = null;
          if (startY !== null && event.changedTouches[0] && event.changedTouches[0].clientY - startY > 100 && event.currentTarget.scrollTop === 0) closePanel();
        }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-500/70 md:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected hex</p>
            <h2 className="break-all text-lg font-semibold">{selectedHex?.h3Index ?? certificate?.h3Index}</h2>
          </div>
          <button
            aria-label="Close purchase modal"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={closePanel}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {checkoutStatus && !certificate ? (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-cyan-200/20 bg-[#101820] p-3 text-sm">
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
            <HexImageUpload hexId={certificate.id} imageUrl={certificate.imageUrl} disabled={isClientDemoMode} onImageChange={applyUploadedImage} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Owner</p>
                  <p className="mt-1 font-medium">{purchased ? purchased.ownerName : "Available"}</p>
                </div>
                {!purchased ? (
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-medium text-emerald-300">Available</span>
                    <span className="font-semibold text-white">Price: $1</span>
                  </div>
                ) : null}
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
                    </div>
                    <p className="text-xs text-muted-foreground">@{purchased.ownerUsername || purchased.ownerName}</p>
                    <p className="text-xs text-muted-foreground">Owned permanently</p>
                  </div>
                </div>
                {purchased.title ? <h3 className="text-lg font-semibold">{purchased.title}</h3> : null}
                {purchased.message ? <p className="mt-3 text-sm text-muted-foreground">{purchased.message}</p> : null}
                {purchased.imageUrl ? <img src={purchased.imageUrl} alt="" className="mt-3 aspect-video w-full rounded-md object-cover" /> : null}
                {purchased.externalLink ? <a href={purchased.externalLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">Visit link</a> : null}
                {purchased.purchaseDate ? <p className="text-xs text-muted-foreground">Purchased {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(purchased.purchaseDate))}</p> : null}
                {isOwnHex ? (
                  <div className="space-y-3 border-t border-border pt-3">
                    <div className="space-y-1.5"><Label htmlFor="owned-title">Title</Label><Input id="owned-title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
                    <div className="space-y-1.5"><Label htmlFor="owned-message">Message</Label><Textarea id="owned-message" maxLength={240} value={message} onChange={(event) => setMessage(event.target.value)} /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label htmlFor="owned-avatar">Avatar URL</Label><Input id="owned-avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></div>
                      <div className="space-y-1.5"><Label htmlFor="owned-image">Image URL</Label><Input id="owned-image" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></div>
                    </div>
                    <HexImageUpload hexId={purchased.id} imageUrl={imageUrl || null} disabled={isClientDemoMode} onImageChange={applyUploadedImage} />
                    <div className="space-y-1.5"><Label htmlFor="owned-link">External link</Label><Input id="owned-link" type="url" value={externalLink} onChange={(event) => setExternalLink(event.target.value)} /></div>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar preview" className="h-12 w-12 rounded-full object-cover" /> : null}
                    {imageUrl ? <img src={imageUrl} alt="Image preview" className="aspect-video w-full rounded-md object-cover" /> : null}
                    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={saveMetadata}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save hex details
                    </Button>
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
                <div className="space-y-3 rounded-md border border-border bg-background p-3">
                  <div>
                    <p className="text-sm font-medium">Add an image from your device</p>
                    <p className="text-xs text-muted-foreground">It uploads securely before checkout and is attached after payment.</p>
                  </div>
                  <input ref={purchaseImageInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => choosePurchaseImage(event.target.files?.[0])} />
                  <Button type="button" variant="outline" className="h-11 w-full" disabled={busy || isClientDemoMode} onClick={() => purchaseImageInputRef.current?.click()}>
                    <ImageUp className="h-4 w-4" /> Choose image
                  </Button>
                  {purchaseImagePreview ? <img src={purchaseImagePreview} alt="Purchase image preview" className="aspect-video w-full rounded-md object-cover" /> : null}
                  {purchaseImage ? <p className="truncate text-xs text-muted-foreground">{purchaseImage.name}</p> : null}
                </div>
                <div className="space-y-1.5"><Label htmlFor="external-link">External link</Label><Input id="external-link" type="url" value={externalLink} onChange={(event) => setExternalLink(event.target.value)} placeholder="https://..." /></div>
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {purchased ? (
              <p className="text-sm text-muted-foreground">This collectible belongs permanently to its owner.</p>
            ) : (
              <div className="sticky bottom-[-1.25rem] z-10 -mx-5 -mb-5 border-t border-border bg-[#0b1117] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:m-0 md:border-0 md:bg-transparent md:p-0">
                <Button className="h-12 w-full md:h-10" onClick={checkout} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  {busy ? purchaseStep ?? "Creating your hex..." : "Buy this Hex - $1"}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
