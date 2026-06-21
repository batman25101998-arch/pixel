"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CheckoutResult = {
  status: "REQUIRES_PAYMENT" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELED" | "PENDING";
  certificate?: { h3Index: string } | null;
};

export function CheckoutSuccess({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<CheckoutResult>({ status: "PENDING" });
  const [error, setError] = useState<string | null>(null);

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
  const mapHref = result.certificate?.h3Index
    ? `/?hex=${encodeURIComponent(result.certificate.h3Index)}`
    : "/";

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {completed ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          {completed ? "Purchase confirmed" : failed ? "Payment not completed" : "Confirming your purchase"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {completed
            ? "Stripe confirmed the $1 payment and ownership has been saved."
            : failed
              ? "No ownership change was made. You can return to the map and try again."
              : "Stripe has returned successfully. We are waiting for the secure webhook confirmation."}
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button asChild className="w-full"><Link href={mapHref}>{completed ? "View my hex" : "Return to map"}</Link></Button>
      </CardContent>
    </Card>
  );
}
