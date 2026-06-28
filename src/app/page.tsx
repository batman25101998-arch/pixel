import { EarthMap } from "@/components/map/earth-map";
import { HeroCta } from "@/components/hero-cta";
import { PurchasePanel } from "@/components/map/purchase-panel";
import { SearchBar } from "@/components/map/search-bar";

export default function HomePage() {
  return (
    <main className="relative h-[calc(100dvh-64px)] min-h-[560px] bg-[#061425] md:h-[calc(100dvh-86px)] lg:grid lg:min-h-0 lg:grid-cols-[400px_1fr] lg:overflow-hidden">
      <section className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-10 w-[min(290px,calc(100%-1.5rem))] border border-white/10 bg-[#071827]/94 p-4 shadow-2xl backdrop-blur-md md:left-5 md:w-[340px] md:p-5 lg:static lg:flex lg:w-auto lg:items-center lg:border-y-0 lg:border-l-0 lg:border-r lg:bg-[#071827] lg:px-14 lg:py-16 lg:shadow-none lg:backdrop-blur-none">
        <div className="max-w-sm">
          <h1 className="text-xl font-semibold leading-tight text-white md:text-3xl lg:text-5xl">Own a Hex of Earth.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300 md:mt-4 lg:mt-7 lg:whitespace-pre-line lg:text-base lg:leading-8">{`Buy your permanent hex for $1.`}<span className="hidden lg:inline">{`\nAdd your photo, message and link.\nYour place stays yours forever.`}</span></p>
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
