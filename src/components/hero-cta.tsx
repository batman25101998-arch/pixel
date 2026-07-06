"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export function HeroCta() {
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    let hideTimer: number | null = null;
    const showToast = () => {
      setToastVisible(true);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setToastVisible(false), 3200);
    };
    window.addEventListener("pixel-earth:buy-first-hex-ready", showToast);
    return () => {
      window.removeEventListener("pixel-earth:buy-first-hex-ready", showToast);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  }, []);

  function focusMap() {
    document.getElementById("world-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setToastVisible(false);
    window.dispatchEvent(new CustomEvent("pixel-earth:buy-first-hex"));
  }

  return (
    <div className="mt-3 md:mt-6 lg:mt-10">
      <button type="button" onClick={focusMap} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-300 md:h-11 md:px-5 lg:h-12 lg:px-6">
        Claim Your First Hex <ArrowRight className="h-4 w-4" />
      </button>
      {toastVisible ? (
        <div role="status" className="fixed left-1/2 top-20 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-emerald-300/30 bg-[#0b1117] px-4 py-2.5 text-sm font-medium text-emerald-200 shadow-2xl md:top-24">
          Click on any available hex to buy.
        </div>
      ) : null}
    </div>
  );
}
