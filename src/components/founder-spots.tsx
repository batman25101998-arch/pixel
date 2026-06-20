"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";

export function FounderSpots({ initialRemaining }: { initialRemaining: number | null }) {
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/founders", { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok) setRemaining(typeof data.remaining === "number" ? data.remaining : null);
      } catch {
        if (active) setRemaining(null);
      }
    }

    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (remaining === null) return null;
  return (
    <Link href="/sign-in" className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200">
      <Crown className="h-3.5 w-3.5" />
      {remaining.toLocaleString()} <span className="hidden sm:inline">Founder spots</span><span className="sm:hidden">left</span>
    </Link>
  );
}
