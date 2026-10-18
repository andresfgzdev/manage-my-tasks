"use client";

import { SegmentMeter } from "@/components/ds/segment-meter";
import { daySummary } from "@/features/tasks/domain/spine";
import { dayTitle, formatDuration, shiftOf } from "@/features/tasks/domain/time";
import { useNow } from "@/features/tasks/client/use-now";
import { useTasks } from "@/features/tasks/client/use-tasks";

export function DayHeader() {
  const now = useNow();
  const { tasks } = useTasks();

  // Same height as the real header, so nothing shifts once the time is known.
  if (!now) return <header className="h-[82px] max-sm:h-[66px]" />;

  const { name, num } = dayTitle(now.date);
  const summary = daySummary(tasks, now.today);
  const focus = formatDuration(summary.focusLeftMin) || "0 min";

  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="kicker">Better Tasks · {shiftOf(Math.floor(now.minute / 60))} shift</span>
        <h1 className="text-[56px] leading-none font-semibold tracking-[-0.03em] max-sm:text-[40px]">
          {name} <span className="font-normal text-ash">{num}</span>
        </h1>
      </div>
      <div className="flex min-w-[260px] flex-col items-end gap-2.5 max-sm:w-full max-sm:items-stretch">
        <span className="font-mono text-[13px] text-ash">
          <span className="text-bone">{summary.done}</span> of {summary.total} done · {focus} focus
          left
        </span>
        <SegmentMeter
          segments={summary.segments}
          label={`${summary.done} of ${summary.total} done today`}
        />
      </div>
    </header>
  );
}
