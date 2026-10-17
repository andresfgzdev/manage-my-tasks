import { cn } from "@/lib/utils";

export function SegmentMeter({ segments, label }: { segments: boolean[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex w-full gap-1">
      {segments.map((done, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-[2px] transition-colors duration-[260ms]",
            done ? "bg-moss" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
