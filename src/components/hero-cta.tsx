"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

export function HeroCta() {
  const [promptVisible, setPromptVisible] = useState(false);

  function focusMap() {
    document.getElementById("world-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPromptVisible(true);
    window.setTimeout(() => document.getElementById("map-search-input")?.focus(), 450);
  }

  return (
    <div className="mt-3 md:mt-6 lg:mt-10">
      <button type="button" onClick={focusMap} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-300 md:h-11 md:px-5 lg:h-12 lg:px-6">
        Buy Your First Hex <ArrowRight className="h-4 w-4" />
      </button>
      <p className={`mt-2 hidden text-xs text-slate-400 transition-opacity md:block ${promptVisible ? "opacity-100" : "opacity-0"}`} aria-live="polite">
        Search for a place or click any available hex.
      </p>
    </div>
  );
}
