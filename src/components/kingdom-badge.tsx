import { Castle } from "lucide-react";
import { cn } from "@/lib/utils";

export function KingdomBadge({
  unlocked,
  compact = false,
  className
}: {
  unlocked?: boolean | null;
  compact?: boolean;
  className?: string;
}) {
  if (!unlocked) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-300/45 bg-violet-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-violet-300",
        className
      )}
      title="Kingdom unlocked: 1,000 owned hexes"
    >
      <Castle className="h-3 w-3" />
      {compact ? "Kingdom" : "Kingdom Owner"}
    </span>
  );
}
