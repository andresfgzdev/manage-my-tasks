"use client";

import { cn } from "@/lib/utils";
import { useNow } from "@/features/tasks/client/use-now";
import { useTasks } from "@/features/tasks/client/use-tasks";
import { hourLoad } from "@/features/tasks/domain/spine";
import { toIsoDate } from "@/features/tasks/domain/time";

const FROM_HOUR = 7;
const TO_HOUR = 23;

const SYNTAX = [
  { token: "15:30 · 3pm", meaning: "time" },
  { token: "~45m · ~2h", meaning: "duration" },
  { token: "! !! !!!", meaning: "priority" },
  { token: "#work", meaning: "tag" },
  { token: "today · tomorrow", meaning: "day" },
];

function Rhythm() {
  const now = useNow();
  const { tasks } = useTasks();
  if (!now) return <div className="h-[72px]" />;

  const loads = hourLoad(tasks, toIsoDate(now), FROM_HOUR, TO_HOUR);
  return (
    <>
      <div className="flex h-14 items-end gap-[3px]" role="img" aria-label="Workload by hour">
        {loads.map((load, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-[2px]",
              FROM_HOUR + i === now.getHours() ? "bg-sodium" : load > 0 ? "bg-faint" : "bg-raise",
            )}
            style={{ height: 6 + Math.min(load, 2) * 22 }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-ash-dim">
        <span>07</span>
        <span>12</span>
        <span>17</span>
        <span>22</span>
      </div>
    </>
  );
}

export function DayAside() {
  return (
    <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-8 pt-2">
      <section className="flex flex-col gap-3">
        <h2 className="kicker">Today&apos;s rhythm</h2>
        <Rhythm />
      </section>

      <section className="flex flex-col">
        <h2 className="kicker pb-2.5">Line syntax</h2>
        {SYNTAX.map((row) => (
          <div
            key={row.token}
            className="flex justify-between gap-3 border-b border-raise py-1.5 text-[13px]"
          >
            <span className="font-mono text-bone">{row.token}</span>
            <span className="text-ash">{row.meaning}</span>
          </div>
        ))}
      </section>
    </aside>
  );
}
