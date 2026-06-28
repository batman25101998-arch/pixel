import Link from "next/link";
import { ArrowRight, Globe2, Image, Landmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContinentStat } from "@/lib/continent-stats";
import { formatNumber } from "@/lib/utils";

const reasons = [
  { title: "Own a permanent place", copy: "Claim a real H3 location and keep its ownership history on the world map.", icon: Landmark, color: "text-emerald-300" },
  { title: "Make it unmistakably yours", copy: "Add an avatar, image, title, message, and link to every collectible hex.", icon: Image, color: "text-cyan-300" },
  { title: "Choose a meaningful location", copy: "Claim a hometown, favorite destination, or memorable place anywhere on Earth.", icon: Globe2, color: "text-violet-300" }
];

function percentage(value: number) {
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`;
}

export function PublicGameSections({ continentStats }: { continentStats: ContinentStat[] }) {
  return (
    <div className="bg-[#06111d] text-white">
      <section className="border-y border-white/8 bg-[#081827] px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"><Sparkles className="h-4 w-4" /> Why own a piece?</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">One dollar starts a story on the world map.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Every purchase is a permanent collectible profile tied to a real location.</p>
            </div>
            <Button asChild className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300"><Link href="/#map">Find your first hex <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
            {reasons.map(({ title, copy, icon: Icon, color }) => (
              <article key={title} className="min-h-48 bg-[#0a1b2a] p-5">
                <Icon className={`h-6 w-6 ${color}`} />
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-[#071522] px-5 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Global ownership</p><h2 className="mt-2 text-2xl font-semibold">Pieces claimed across Earth</h2></div><Link href="/leaderboard" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">View owners</Link></div>
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {continentStats.map((continent) => (
              <div key={continent.name} className="border-t border-white/12 pt-4">
                <div className="flex items-baseline justify-between gap-4"><h3 className="font-medium">{continent.name}</h3><span className="font-semibold text-cyan-200">{percentage(continent.ownershipPercent)}</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(continent.ownershipPercent > 0 ? 1 : 0, Math.min(100, continent.ownershipPercent))}%` }} /></div>
                <p className="mt-2 text-xs text-slate-400">{formatNumber(continent.ownedHexes)} claimed hexes</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
