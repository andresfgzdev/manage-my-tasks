import { cn } from "@/lib/utils";

const NAMES = ["none", "low", "medium", "high"] as const;
const HEIGHTS = ["h-[7px]", "h-[10px]", "h-[13px]"];

export function PriorityBars({ priority }: { priority: 0 | 1 | 2 | 3 }) {
  return (
    <span
      role="img"
      aria-label={`Priority ${NAMES[priority]}`}
      className="inline-flex items-end gap-0.5"
    >
      {HEIGHTS.map((height, i) => (
        <span
          key={height}
          className={cn("w-[3px] rounded-[1px]", height, i < priority ? "bg-sodium" : "bg-line")}
        />
      ))}
    </span>
  );
}
