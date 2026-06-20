import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FounderBadge({
  founderNumber,
  compact = false,
  className
}: {
  founderNumber?: number | null;
  compact?: boolean;
  className?: string;
}) {
  if (!founderNumber) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300/45 bg-amber-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300",
        className
      )}
      title={`Founder #${founderNumber.toLocaleString()}`}
    >
      <Crown className="h-3 w-3 fill-amber-300/25" />
      {compact ? "Founder" : `Founder #${founderNumber.toLocaleString()}`}
    </span>
  );
}
