import { EarthMap } from "@/components/map/earth-map";
import { PurchasePanel } from "@/components/map/purchase-panel";
import { SearchBar } from "@/components/map/search-bar";
import { BarChart3, ChevronRight, Crown, Download, Hexagon, Play, Shield, Users } from "lucide-react";

export default function HomePage() {
  return (
    <section className="relative h-screen overflow-hidden bg-[#061425]">
      <EarthMap />
      <SearchBar />
      <PurchasePanel />
      <aside className="absolute left-3 top-3 z-20 hidden w-[300px] space-y-3 xl:block">
        <div className="rounded-lg border border-cyan-200/18 bg-[#071827]/88 p-4 shadow-2xl shadow-black/35 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-white">The World for Everyone.</h2>
          <p className="mt-2 text-sm leading-5 text-slate-300">Buy a pixel for $1 and leave your mark on Earth forever.</p>
          <button className="mt-4 h-11 w-full rounded-md bg-gradient-to-r from-[#77df6f] to-[#5dcc69] text-sm font-bold text-[#04120a] shadow-lg shadow-emerald-500/20">
            BUY PIXEL - $1
          </button>
          <div className="mt-5 space-y-3">
            {[
              ["Pixels sold", "238,543,227", "23.85%", Hexagon],
              ["Total players", "156,982", "", Users],
              ["Map discovered", "23.85%", "", Shield]
            ].map(([label, value, delta, Icon]) => (
              <div key={label as string} className="flex items-center gap-3 border-t border-white/10 pt-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8">
                  <Icon className="h-4 w-4 text-slate-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{label as string}</p>
                  <p className="text-sm font-semibold text-white">{value as string}</p>
                </div>
                {delta ? <span className="text-xs font-semibold text-[#74e46f]">{delta as string}</span> : null}
              </div>
            ))}
          </div>
          <button className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 text-xs font-semibold text-slate-100">
            <Play className="h-4 w-4" /> HOW IT WORKS
          </button>
        </div>

        <div className="rounded-lg border border-cyan-200/18 bg-[#071827]/88 p-3 shadow-2xl shadow-black/30 backdrop-blur-md">
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
            <div key={name} className="flex items-center gap-3 border-t border-white/8 py-2 first:border-t-0">
              <div className="h-11 w-11 rounded-md bg-gradient-to-br from-slate-500 to-slate-800 ring-1 ring-white/10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{name}</p>
                <p className="text-xs text-slate-400">{price}</p>
                <p className="text-xs text-[#89e66c]">High demand</p>
              </div>
              <BarChart3 className="h-5 w-5 text-[#72e35f]" />
            </div>
          ))}
        </div>
      </aside>

      <div className="absolute left-[330px] top-3 z-20 hidden rounded-lg border border-cyan-200/16 bg-[#071827]/90 p-3 shadow-xl shadow-black/30 backdrop-blur-md xl:block">
        <button className="mb-3 flex h-9 items-center gap-2 rounded-md bg-black/35 px-3 text-xs font-bold text-white">
          <Download className="h-4 w-4" /> VIEW FULL EARTH
        </button>
        <div className="space-y-2 text-sm text-white">
          {[
            ["Available", "bg-slate-300"],
            ["Owned by you", "bg-[#31c95b]"],
            ["Your territory", "bg-[#64dd42]"],
            ["For sale", "bg-[#f4b633]"],
            ["Special", "bg-[#8b5cf6]"]
          ].map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`h-4 w-4 ${color} mock-legend-hex`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className="absolute right-3 top-3 z-20 hidden w-[350px] overflow-hidden rounded-lg border border-cyan-200/18 bg-[#071827]/92 shadow-2xl shadow-black/35 backdrop-blur-md 2xl:block">
        <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
          <h3 className="text-sm font-bold tracking-wide text-white">PIXEL DETAILS</h3>
          <ChevronRight className="h-4 w-4 rotate-45 text-slate-300" />
        </div>
        <div className="pixel-detail-preview h-36" />
        <div className="space-y-4 p-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Coordinates</p>
            <p className="font-semibold text-white">40.4168 N, 3.7038 W</p>
            <p className="text-xs text-cyan-300">Madrid, Spain</p>
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Owner</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-rose-500" />
              <span className="font-medium text-white">Martina</span>
              <span className="ml-auto text-xs text-[#75e866]">You own this pixel</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Date purchased</p>
              <p className="text-xs text-white">May 12, 2024</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Price</p>
              <p className="text-xs text-white">$1.00</p>
            </div>
          </div>
          <button className="h-10 w-full rounded-md bg-[#71db66] text-sm font-bold text-[#06120a]">VIEW ON MAP</button>
        </div>
      </aside>

      <div className="absolute bottom-3 left-1/2 z-20 hidden w-[min(920px,calc(100vw-680px))] -translate-x-1/2 overflow-hidden rounded-lg border border-cyan-200/18 bg-[#071827]/92 shadow-2xl shadow-black/35 backdrop-blur-md 2xl:block">
        <div className="flex h-11 items-center gap-3 border-b border-white/10 px-4">
          <ChevronRight className="h-4 w-4 rotate-180 text-slate-200" />
          <h3 className="font-semibold text-white">MADRID, SPAIN</h3>
        </div>
        <div className="local-hex-preview h-48" />
        <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10">
          <div className="p-4">
            <p className="text-xs font-semibold uppercase text-[#76e55f]">Your territory</p>
            <p className="mt-1 text-2xl font-bold text-white">137</p>
            <p className="text-xs text-slate-400">pixels</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase text-[#76e55f]">Rank</p>
            <p className="mt-1 text-2xl font-bold text-white">#4,275</p>
            <p className="text-xs text-slate-400">of 156,982</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase text-[#76e55f]">Value</p>
            <p className="mt-1 text-2xl font-bold text-[#f6c04a]">$137</p>
            <p className="text-xs text-[#76e55f]">+12.4% (30d)</p>
          </div>
          <div className="flex items-center justify-center p-4">
            <button className="h-12 rounded-md bg-[#1476d7] px-8 text-sm font-bold text-white">MANAGE TERRITORY</button>
          </div>
        </div>
      </div>
    </section>
  );
}
