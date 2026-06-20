import { Award, Castle, Crown, Gem, Hexagon, Store, Trophy } from "lucide-react";
import type { GamificationBadge } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const icons = {
  founder: Crown,
  "first-hex": Hexagon,
  "village-owner": Castle,
  "city-builder": Trophy,
  "kingdom-founder": Crown,
  "collector-100": Gem,
  "marketplace-seller": Store
} as const;

export function GamificationBadges({ badges, compact = false }: { badges: GamificationBadge[]; compact?: boolean }) {
  if (!badges.length) return <p className="text-sm text-muted-foreground">Buy your first hex to unlock a badge.</p>;
  return <div className="flex flex-wrap gap-2">{badges.map((badge) => {
    const Icon = icons[badge.id] ?? Award;
    return <span key={badge.id} title={badge.description} className={cn("inline-flex items-center gap-1.5 rounded-md border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200", compact && "px-1.5 py-0.5 text-[11px]")}><Icon className="h-3.5 w-3.5" />{badge.label}</span>;
  })}</div>;
}
