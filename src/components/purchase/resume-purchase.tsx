"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPendingHexPurchase } from "@/lib/pending-hex-purchase";

export function ResumePurchase() {
  const router = useRouter();

  useEffect(() => {
    const draft = getPendingHexPurchase();
    if (!draft) {
      router.replace("/");
      return;
    }

    router.replace(`/?hex=${encodeURIComponent(draft.h3Index)}&resumePurchase=1`);
  }, [router]);

  return (
    <main className="flex min-h-[calc(100vh-86px)] items-center justify-center gap-3 px-4 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      Restoring your hex purchase...
    </main>
  );
}
