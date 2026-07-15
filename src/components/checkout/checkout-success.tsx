"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackGaEvent } from "@/lib/analytics";

type CheckoutResult = {
  status: "REQUIRES_PAYMENT" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELED" | "PENDING";
  certificate?: { h3Index: string } | null;
};

export function CheckoutSuccess({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<CheckoutResult>({ status: "PENDING" });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [completionTracked, setCompletionTracked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function checkPayment() {
      attempts += 1;
      try {
        const response = await fetch(`/api/checkout/status?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Payment status could not be loaded.");
        const nextResult = (await response.json()) as CheckoutResult;
        if (cancelled) return;
        setResult(nextResult);

        if (["PENDING", "REQUIRES_PAYMENT", "PROCESSING"].includes(nextResult.status) && attempts < 20) {
          timer = setTimeout(checkPayment, 1500);
        }
      } catch {
        if (!cancelled) setError("We could not confirm the payment yet. Please refresh this page shortly.");
      }
    }

    void checkPayment();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  const completed = result.status === "SUCCEEDED" && result.certificate;
  const failed = ["FAILED", "CANCELED", "REFUNDED"].includes(result.status);
  const progressText = result.status === "PROCESSING" ? "Saving forever..." : "Creating your hex...";
  const mapHref = result.certificate?.h3Index
    ? `/?hex=${encodeURIComponent(result.certificate.h3Index)}`
    : "/";

  useEffect(() => {
    if (!completed || completionTracked) return;
    trackGaEvent("purchase_completed", {
      h3Index: result.certificate?.h3Index,
      value: 1,
      currency: "USD"
    });
    setCompletionTracked(true);
  }, [completed, completionTracked, result.certificate?.h3Index]);

  function shareUrl() {
    return new URL(mapHref, window.location.origin).toString();
  }

  async function copyHexLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("The hex link could not be copied. You can copy it from the map page.");
    }
  }

  function shareTo(network: "x" | "facebook") {
    const url = encodeURIComponent(shareUrl());
    const destination = network === "x"
      ? `https://x.com/intent/post?text=${encodeURIComponent("I just claimed a piece of Earth.")}&url=${url}`
      : `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(destination, "_blank", "noopener,noreferrer,width=720,height=640");
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {completed ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          {completed ? "Purchase confirmed" : failed ? "Payment not completed" : progressText}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {completed
            ? "Stripe confirmed the $1 payment and ownership has been saved."
            : failed
              ? "No ownership change was made. You can return to the map and try again."
              : result.status === "PROCESSING"
                ? "Your payment is confirmed. We are saving permanent ownership now."
                : "Your payment returned successfully. We are creating your permanent hex."}
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {completed ? (
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center gap-2"><Share2 className="h-4 w-4 text-secondary" /><h3 className="font-semibold">Share your land</h3></div>
            <p className="break-all rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">{result.certificate?.h3Index}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button type="button" variant="outline" onClick={copyHexLink}><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy link"}</Button>
              <Button type="button" variant="outline" onClick={() => shareTo("x")}>Share to X</Button>
              <Button type="button" variant="outline" onClick={() => shareTo("facebook")}>Facebook</Button>
            </div>
          </div>
        ) : null}
        <Button asChild className="w-full"><Link href={mapHref}>{completed ? "View my hex" : "Return to map"}</Link></Button>
      </CardContent>
    </Card>
  );
}
