import { EarthMap } from "@/components/map/earth-map";
import { HeroCta } from "@/components/hero-cta";
import { PurchasePanel } from "@/components/map/purchase-panel";
import { SearchBar } from "@/components/map/search-bar";

export default function HomePage() {
  return (
    <main className="relative h-[calc(100dvh-64px)] min-h-[560px] bg-[#061425] md:h-[calc(100dvh-86px)] lg:grid lg:min-h-0 lg:grid-cols-[400px_1fr] lg:overflow-hidden">
      <section className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-10 w-[min(270px,calc(100%-1.5rem))] border border-white/10 bg-[#071827] p-3.5 shadow-2xl md:bottom-5 md:left-5 md:w-[340px] md:p-5 lg:static lg:flex lg:w-auto lg:items-center lg:border-y-0 lg:border-l-0 lg:border-r lg:px-14 lg:py-16 lg:shadow-none">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold leading-tight text-white md:text-3xl lg:text-5xl">Claim Your Place on Earth Forever.</h1>
          <div className="mt-2 space-y-0.5 text-sm leading-5 text-slate-300 md:mt-4 md:space-y-1 md:leading-6 lg:mt-7 lg:text-base lg:leading-8">
            <p className="font-medium text-emerald-300">Own a permanent hex on Earth for just $1.</p>
            <p>Add your photo, your message and make your mark forever.</p>
          </div>
          <HeroCta />
        </div>
      </section>

      <section id="world-map" className="relative h-full min-h-0 min-w-0 scroll-mt-16 overflow-hidden md:scroll-mt-[86px] lg:h-full" aria-label="Interactive Earth hex map">
        <EarthMap />
        <SearchBar />
        <PurchasePanel />
      </section>
    </main>
  );
}
