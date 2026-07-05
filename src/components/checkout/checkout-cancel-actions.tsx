"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getPendingHexPurchase } from "@/lib/pending-hex-purchase";

export function CheckoutCancelActions({ mapHref }: { mapHref: string }) {
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    setCanResume(Boolean(getPendingHexPurchase()));
  }, []);

  return (
    <div className="grid gap-2">
      {canResume ? <Button asChild><Link href="/">Resume Purchase</Link></Button> : null}
      <Button asChild variant={canResume ? "outline" : "default"}><Link href={mapHref}>Return to hex</Link></Button>
    </div>
  );
}
