"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { getPendingHexPurchase } from "@/lib/pending-hex-purchase";

export default function ResumePurchasePage() {
  const router = useRouter();
  const { status } = useSession();
  const loggedOpen = useRef(false);

  useEffect(() => {
    if (!loggedOpen.current) {
      console.log("[purchase-resume] resume page opened");
      loggedOpen.current = true;
    }

    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace("/sign-in?callbackUrl=%2Fpurchase%2Fresume");
      return;
    }

    const draft = getPendingHexPurchase();
    if (!draft) {
      router.replace("/");
      return;
    }

    router.replace(`/?resumePurchase=1&h3Index=${encodeURIComponent(draft.h3Index)}`);
  }, [router, status]);

  return (
    <main className="flex min-h-[calc(100vh-86px)] items-center justify-center gap-3 px-4 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      Restoring your hex purchase...
    </main>
  );
}
