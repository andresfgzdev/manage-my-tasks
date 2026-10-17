import { cn } from "@/lib/utils";

// `label` is passed in (not formatted here) so this primitive does not depend
// on the tasks feature.
export function DurationRule({
  minutes,
  label,
  done,
  max = 120,
}: {
  minutes: number;
  label: string;
  done?: boolean;
  max?: number;
}) {
  const percent = minutes <= 0 ? 0 : Math.max(6, (Math.min(minutes, max) / max) * 100);

  return (
    <span className="inline-flex items-center gap-3">
      <span aria-hidden="true" className="h-[3px] w-[140px] shrink-0 overflow-hidden rounded-sm bg-raise">
        <span
          className={cn(
            "block h-full rounded-sm transition-colors duration-[220ms]",
            done ? "bg-moss" : "bg-ash",
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="font-mono text-[11px] text-ash">{label}</span>
    </span>
  );
}
