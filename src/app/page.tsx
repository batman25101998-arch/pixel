import { EarthMap } from "@/components/map/earth-map";
import { PurchasePanel } from "@/components/map/purchase-panel";
import { SearchBar } from "@/components/map/search-bar";
import { PublicGameSections } from "@/components/public-game-sections";
import { demoContinentStats, getContinentStats } from "@/lib/continent-stats";
import { isDemoMode } from "@/lib/env";
import { BarChart3, Download, Hexagon, Play, Shield, Users } from "lucide-react";

export default async function HomePage() {
  const continentStats = isDemoMode ? demoContinentStats : await getContinentStats();

  return (
    <main>
    <section id="map" className="grid min-h-[calc(100vh-86px)] bg-[#061425] lg:h-[calc(100vh-86px)] lg:min-h-0 lg:grid-cols-[minmax(340px,470px)_1fr] lg:overflow-hidden">
      <aside className="min-h-0 overflow-y-auto border-r border-cyan-200/14 bg-[#071827]/96 p-4 shadow-2xl shadow-black/35">
        <div className="rounded-lg border border-cyan-200/18 bg-[#0a1c2c]/88 p-5 shadow-2xl shadow-black/35 backdrop-blur-md">
          <h2 className="text-xl font-semibold text-white">The World for Everyone.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Buy a pixel for $1 and leave your mark on Earth forever.</p>
          <button className="mt-5 h-12 w-full rounded-md bg-gradient-to-r from-[#77df6f] to-[#5dcc69] text-sm font-bold text-[#04120a] shadow-lg shadow-emerald-500/20">
            BUY PIXEL - $1
          </button>
          <div className="mt-6 space-y-4">
            {[
              ["Pixels sold", "238,543,227", "23.85%", Hexagon],
              ["Total players", "156,982", "", Users],
              ["Map discovered", "23.85%", "", Shield]
            ].map(([label, value, delta, Icon]) => (
              <div key={label as string} className="flex items-center gap-3 border-t border-white/10 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
                  <Icon className="h-4 w-4 text-slate-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{label as string}</p>
                  <p className="text-base font-semibold text-white">{value as string}</p>
                </div>
                {delta ? <span className="text-xs font-semibold text-[#74e46f]">{delta as string}</span> : null}
              </div>
            ))}
          </div>
          <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 text-xs font-semibold text-slate-100">
            <Play className="h-4 w-4" /> HOW IT WORKS
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-cyan-200/18 bg-[#0a1c2c]/88 p-4 shadow-2xl shadow-black/30 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">Popular locations</h3>
            <span className="text-[11px] font-semibold text-cyan-300">VIEW ALL</span>
          </div>
          {[
            ["Times Square, NYC", "From $150"],
            ["Eiffel Tower, Paris", "From $120"],
            ["Colosseum, Rome", "From $95"],
            ["Mount Fuji, Japan", "From $80"],
            ["Bondi Beach, Australia", "From $60"]
          ].map(([name, price]) => (
            <div key={name} className="flex items-center gap-3 border-t border-white/8 py-3 first:border-t-0">
              <div className="h-12 w-12 rounded-md bg-gradient-to-br from-slate-500 to-slate-800 ring-1 ring-white/10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{name}</p>
                <p className="text-xs text-slate-400">{price}</p>
                <p className="text-xs text-[#89e66c]">High demand</p>
              </div>
              <BarChart3 className="h-5 w-5 text-[#72e35f]" />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-cyan-200/18 bg-[#0a1c2c]/88 p-4 shadow-2xl shadow-black/30 backdrop-blur-md">
          <button className="mb-4 flex h-10 items-center gap-2 rounded-md bg-black/35 px-3 text-xs font-bold text-white">
            <Download className="h-4 w-4" /> VIEW FULL EARTH
          </button>
          <div className="space-y-3 text-sm text-white">
            {[
              ["Available", "bg-[#0f172a] ring-slate-500"],
              ["Owned by you", "bg-[#31c95b] ring-emerald-200"],
              ["Your territory", "bg-[#64dd42] ring-lime-200"],
              ["For sale", "bg-[#f4b633] ring-amber-100"],
              ["Special", "bg-[#8b5cf6] ring-violet-200"]
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`h-4 w-4 ${color} mock-legend-hex ring-1`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="relative h-[72vh] min-h-[520px] min-w-0 overflow-hidden lg:h-full lg:min-h-0">
        <EarthMap />
        <SearchBar />
        <PurchasePanel />
      </div>
    </section>
    <PublicGameSections continentStats={continentStats} />
    </main>
  );
}
