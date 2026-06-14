import { EarthMap } from "@/components/map/earth-map";
import { PurchasePanel } from "@/components/map/purchase-panel";
import { SearchBar } from "@/components/map/search-bar";

export default function HomePage() {
  return (
    <section className="relative h-screen overflow-hidden">
      <EarthMap />
      <SearchBar />
      <PurchasePanel />
      <div className="absolute right-4 top-4 z-20 min-w-[220px] rounded-lg border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Legend</p>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-700/70 ring-1 ring-slate-200/20" /> Available
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" /> Owned by me
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600" /> Owned by others
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-400" /> For sale
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-violet-500" /> Special
          </div>
        </div>
      </div>
    </section>
  );
}
