import { Download } from "lucide-react";
import { EarthMap } from "@/components/map/earth-map";
import { PurchasePanel } from "@/components/map/purchase-panel";
import { SearchBar } from "@/components/map/search-bar";
import { PublicGameSections } from "@/components/public-game-sections";
import { demoContinentStats, getContinentStats } from "@/lib/continent-stats";
import { isDemoMode } from "@/lib/env";

export default async function HomePage() {
  const continentStats = isDemoMode ? demoContinentStats : await getContinentStats();
  return <main>
    <section id="map" className="grid min-h-[calc(100vh-86px)] bg-[#061425] lg:h-[calc(100vh-86px)] lg:min-h-0 lg:grid-cols-[360px_1fr] lg:overflow-hidden">
      <aside className="min-h-0 overflow-y-auto border-r border-cyan-200/14 bg-[#071827]/96 p-4">
        <div className="border-b border-white/10 px-2 pb-6 pt-2">
          <h1 className="text-3xl font-semibold leading-tight text-white">Buy a Piece of Earth.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Claim a permanent place on the world map for $1 and leave your mark forever.</p>
          <a href="#map" className="mt-5 flex h-12 w-full items-center justify-center rounded-md bg-[#67d66f] text-sm font-bold text-[#04120a] hover:bg-[#78e47f]">BUY A PIECE - $1</a>
          <p className="mt-3 text-center text-xs text-slate-400">Choose any available hex on the map.</p>
        </div>

        <div className="px-2 py-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase text-slate-300"><Download className="h-4 w-4" /> Map legend</div>
          <div className="space-y-4 text-sm text-white">
            {[
              ["Available", "bg-[#0f172a] ring-slate-500"],
              ["Owned by you", "bg-[#31c95b] ring-emerald-200"],
              ["Owned", "bg-[#2563eb] ring-blue-200"]
            ].map(([label, color]) => <div key={label} className="flex items-center gap-3"><span className={`mock-legend-hex h-4 w-4 ${color} ring-1`} /><span>{label}</span></div>)}
          </div>
        </div>
      </aside>
      <div className="relative h-[72vh] min-h-[520px] min-w-0 overflow-hidden lg:h-full lg:min-h-0"><EarthMap /><SearchBar /><PurchasePanel /></div>
    </section>
    <PublicGameSections continentStats={continentStats} />
  </main>;
}
