"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DurationRule } from "@/components/ds/duration-rule";
import { HoldButton } from "@/components/ds/hold-button";
import { PriorityBars } from "@/components/ds/priority-bars";
import { Tick } from "@/components/ds/tick";
import { cn } from "@/lib/utils";
import { useTaskActions } from "@/features/tasks/client/use-tasks";
import type { Task } from "@/features/tasks/domain/task";
import { formatDuration, formatHM } from "@/features/tasks/domain/time";
import { TaskDetail } from "./task-detail";

const FRESH_MS = 3000;

export function TaskRow({
  task,
  overdue,
  index,
  open,
  onOpen,
  onClose,
}: {
  task: Task;
  overdue: boolean;
  index: number;
  open: boolean;
  onOpen(): void;
  onClose(): void;
}) {
  const actions = useTaskActions();

  // A row created moments ago gets the sodium wash. Measured once, at mount.
  const [fresh] = useState(() => Date.now() - Date.parse(task.createdAt) < FRESH_MS);
  // A fresh row that already has its real id replaced the optimistic one a
  // moment ago and was animated then: it must not fade in a second time.
  const animateEntry = !fresh || task.id.startsWith("tmp-");

  if (open) return <TaskDetail task={task} onClose={onClose} />;

  return (
    <div
      className={cn("group relative min-h-[60px] rounded-row", animateEntry && "animate-row-in")}
      style={animateEntry ? { animationDelay: `${Math.min(index * 30, 240)}ms` } : undefined}
    >
      {fresh && (
        <span className="pointer-events-none absolute inset-0 animate-wash rounded-row bg-sodium" />
      )}
      <div className="flex min-h-[60px] items-center rounded-row transition-colors duration-[140ms] [@media(hover:hover)]:hover:bg-surface">
        <span
          className={cn(
            "w-[52px] shrink-0 text-right font-mono text-[13px]",
            task.done ? "text-faint" : overdue ? "text-sodium" : "text-ash",
          )}
        >
          {task.startMin === null ? "—" : formatHM(task.startMin)}
        </span>

        <span aria-hidden="true" className="grid w-[29px] shrink-0 place-items-center">
          <span
            className={cn(
              "size-[7px] rounded-full border-[1.5px] bg-ground",
              task.done ? "border-moss" : overdue ? "border-sodium" : "border-faint",
            )}
          />
        </span>

        <div className="mr-3.5">
          <Tick
            checked={task.done}
            onCheckedChange={() => actions.toggle(task.id)}
            label={task.done ? "Mark as pending" : "Complete"}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <button
              type="button"
              aria-expanded={false}
              onClick={onOpen}
              className={cn(
                "relative cursor-pointer rounded-sm text-left text-base font-medium break-words focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none",
                task.priority === 3 && "font-semibold",
                task.done && "text-ash",
              )}
            >
              {task.title}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 top-[55%] h-[1.5px] origin-left scale-x-0 bg-ash transition-transform duration-[260ms] ease-out-strong",
                  task.done && "scale-x-100",
                )}
              />
            </button>
            {task.tag && <span className="font-mono text-xs text-ash">#{task.tag}</span>}
          </div>
          <div className="flex items-center gap-3">
            <DurationRule
              minutes={task.durationMin}
              label={formatDuration(task.durationMin) || "no duration"}
              done={task.done}
            />
            <PriorityBars priority={task.priority} />
          </div>
        </div>

        <div className="ml-2 opacity-0 transition-opacity group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <HoldButton label="Hold to delete" onConfirm={() => actions.remove(task.id)}>
            <Trash2 className="size-[18px]" />
          </HoldButton>
        </div>
      </div>
    </div>
  );
}
