"use client";

import { useCallback, useMemo, useState } from "react";
import { NowMarker } from "@/components/ds/now-marker";
import { useNow } from "@/features/tasks/client/use-now";
import { useTasks } from "@/features/tasks/client/use-tasks";
import { buildSpine } from "@/features/tasks/domain/spine";
import type { Lens } from "@/features/tasks/domain/spine";
import { TaskRow } from "./task-row";

export function DaySpine({ lens }: { lens: Lens }) {
  const now = useNow();
  const { tasks, isLoading, isError } = useTasks();
  const [openId, setOpenId] = useState<string | null>(null);

  const open = useCallback((id: string) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);
  const todayIso = now?.today ?? null;
  const nowMin = now?.minute ?? 0;
  const items = useMemo(
    () => (todayIso ? buildSpine(tasks, lens, todayIso, nowMin) : []),
    [tasks, lens, todayIso, nowMin],
  );

  const root = "min-w-0 flex-[999_1_560px] pb-[280px]";

  if (isError) {
    return (
      <div className={root}>
        <p className="pl-[90px] pt-6 text-sm text-ash">Couldn&apos;t load your tasks.</p>
      </div>
    );
  }

  if (isLoading || !now) {
    return (
      <div className={root} aria-busy="true">
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[60px] animate-shimmer rounded-row bg-surface/60"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const hasTasks = items.some((item) => item.type === "task");
  let rowIndex = 0;

  return (
    <div className={root}>
      <div className="relative flex flex-col">
        <span aria-hidden="true" className="absolute inset-y-0 left-[66px] w-px bg-line" />
        {items.map((item) => {
          if (item.type === "now") return <NowMarker key="now" label={item.label} />;
          if (item.type === "heading") {
            return (
              <div key={`heading-${item.label}`} className="kicker pt-7 pb-2.5 pl-[90px]">
                {item.label}
              </div>
            );
          }
          return (
            <TaskRow
              key={item.task.id}
              task={item.task}
              overdue={item.overdue}
              index={rowIndex++}
              open={openId === item.task.id}
              onOpen={open}
              onClose={close}
            />
          );
        })}
      </div>
      {!hasTasks && (
        <div className="flex animate-view-in flex-col gap-1.5 py-12 pl-[90px]">
          <span className="text-lg font-semibold">Nothing here.</span>
          <span className="text-sm text-ash">
            Type in the line below; anything with a time lands in its slot.
          </span>
        </div>
      )}
    </div>
  );
}
