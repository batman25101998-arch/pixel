"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "onboardingCompleted";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ONBOARDING_KEY) !== "true") setOpen(true);
    } catch {
      // Do not repeatedly interrupt visitors when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") completeOnboarding();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function completeOnboarding(startExploring = false) {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // Closing the current modal still works when storage is unavailable.
    }
    setOpen(false);

    if (startExploring) {
      document.getElementById("world-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.dispatchEvent(new CustomEvent("pixel-earth:onboarding-start-exploring"));
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => completeOnboarding()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
        className="w-full rounded-t-xl border border-white/15 bg-[#0b1117]/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/60 backdrop-blur-xl sm:max-w-lg sm:rounded-lg sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-500/70 sm:hidden" aria-hidden="true" />
        <h2 id="welcome-title" className="text-xl font-semibold text-white sm:text-2xl">🌍 Welcome to Own a Hex of Earth</h2>
        <p className="mt-2 font-medium text-emerald-300">Claim Your Place on Earth Forever.</p>

        <div id="welcome-description" className="mt-5">
          <ol className="space-y-3 text-sm text-slate-200 sm:text-base">
            <li className="flex gap-3"><span className="font-semibold text-cyan-300">1.</span><span>Find a place you love.</span></li>
            <li className="flex gap-3"><span className="font-semibold text-cyan-300">2.</span><span>Click an available hex.</span></li>
            <li className="flex gap-3"><span className="font-semibold text-cyan-300">3.</span><span>Claim it forever for just $1.</span></li>
            <li className="flex gap-3"><span className="font-semibold text-cyan-300">4.</span><span>Add your photo, message and personal link.</span></li>
          </ol>
          <p className="mt-5 rounded-md border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-200">Every available hex costs just $1.</p>
          <p className="mt-4 text-sm text-slate-400">Your hex belongs to you permanently.</p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button type="button" className="h-11" onClick={() => completeOnboarding(true)}>Start Exploring</Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => completeOnboarding()}>Skip</Button>
        </div>
      </section>
    </div>
  );
}
