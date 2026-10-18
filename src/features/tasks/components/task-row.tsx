"use client";

import { X } from "lucide-react";
import { memo, useState } from "react";
import { useContextMenuHandler } from "@/components/ds/app-menu";
import { DeleteButton } from "@/components/ds/delete-button";
import { DurationRule } from "@/components/ds/duration-rule";
import { PriorityBars } from "@/components/ds/priority-bars";
import { Tick } from "@/components/ds/tick";
import { cn } from "@/lib/utils";
import { isUnsaved, useTaskActions } from "@/features/tasks/client/use-tasks";
import { removeTimeMention, splitTimeMentions } from "@/features/tasks/domain/parse-line";
import type { Task } from "@/features/tasks/domain/task";
import { formatDuration, formatHM, formatRange } from "@/features/tasks/domain/time";
import { useTaskEditor } from "./task-editor";
import { useTaskMenu } from "./task-menu";
import { TaskDetail } from "./task-detail";

const FRESH_MS = 3000;
const LEAVE_MS = 220;

/** Time words in the title: a highlighted mention; the X removes only the text, not the time. */
function TimeMention({ text, onRemove }: { text: string; onRemove(): void }) {
  return (
    <span className="group/mention inline-flex h-6 items-center rounded-chip border border-sodium/30 bg-sodium/10 px-1.5 font-mono text-[13px] font-medium text-sodium-soft transition-colors hover:border-sodium/60">
      {text}
      <button
        type="button"
        aria-label={`Remove ${text} from the text (the time stays)`}
        title="Remove from the text (the time stays)"
        onClick={onRemove}
        className="grid size-4 max-w-0 place-items-center overflow-hidden rounded-sm text-sodium-soft opacity-0 transition-[max-width,opacity,margin] duration-150 ease-out-strong group-hover/mention:ml-1 group-hover/mention:max-w-4 group-hover/mention:opacity-100 focus-visible:ml-1 focus-visible:max-w-4 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function TaskTitle({
  task,
  onOpen,
  onRemoveMention,
}: {
  task: Task;
  onOpen(): void;
  onRemoveMention(index: number): void;
}) {
  const classes = cn(
    "cursor-pointer rounded-sm text-left text-base font-medium break-words focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none",
    task.priority === 3 && "font-semibold",
    task.done && "text-ash",
  );
  // Mentions only make sense while the task really has a time.
  const parts =
    task.startMin === null
      ? [{ text: task.title, time: false }]
      : splitTimeMentions(task.title).map((p) => ({ ...p, text: p.time ? p.text : p.text.trim() }));
  let mention = -1;

  return (
    <span className="relative flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {parts
        .filter((part) => part.text !== "")
        .map((part, i) => {
          if (part.time) {
            const index = ++mention;
            return (
              <TimeMention key={i} text={part.text} onRemove={() => onRemoveMention(index)} />
            );
          }
          return (
            <button key={i} type="button" aria-expanded={false} onClick={onOpen} className={classes}>
              {part.text}
            </button>
          );
        })}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-[55%] h-[1.5px] origin-left scale-x-0 bg-ash transition-transform duration-[260ms] ease-out-strong",
          task.done && "scale-x-100",
        )}
      />
    </span>
  );
}

export const TaskRow = memo(function TaskRow({
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
  onOpen(id: string): void;
  onClose(): void;
}) {
  const actions = useTaskActions();
  const taskMenu = useTaskMenu();
  const editor = useTaskEditor();
  const [leaving, setLeaving] = useState(false);

  // A row created moments ago gets the sodium wash. Measured once, at mount.
  const [fresh] = useState(() => Date.now() - Date.parse(task.createdAt) < FRESH_MS);
  // A fresh row that already has its real id replaced the optimistic one a
  // moment ago and was animated then: it must not fade in a second time.
  const animateEntry = !fresh || isUnsaved(task);

  const onContextMenu = useContextMenuHandler(() =>
    taskMenu(task, () => onOpen(task.id)),
  );

  const remove = () => {
    setLeaving(true);
    setTimeout(() => actions.remove(task.id), LEAVE_MS);
  };

  if (open) return <TaskDetail task={task} onClose={onClose} />;

  const range =
    task.startMin !== null && task.durationMin > 0
      ? `${formatRange(task.startMin, task.durationMin)} · ${formatDuration(task.durationMin)}`
      : formatDuration(task.durationMin);

  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-[220ms] ease-out-strong",
        leaving ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn("group relative min-h-[60px] rounded-row", animateEntry && "animate-row-in")}
          style={animateEntry ? { animationDelay: `${Math.min(index * 30, 240)}ms` } : undefined}
        >
          {fresh && (
            <span className="pointer-events-none absolute inset-0 animate-wash rounded-row bg-sodium" />
          )}
          <div className="flex min-h-[60px] items-center rounded-row transition-colors duration-[140ms] [@media(hover:hover)]:hover:bg-surface/80">
            <span
              className={cn(
                "w-[52px] shrink-0 text-right font-mono text-[13px] transition-colors",
                task.done ? "text-faint" : overdue ? "text-sodium" : "text-ash",
              )}
            >
              {task.startMin === null ? "—" : formatHM(task.startMin)}
            </span>

            <span aria-hidden="true" className="grid w-[29px] shrink-0 place-items-center">
              <span
                className={cn(
                  "size-[7px] rounded-full border-[1.5px] bg-ground transition-colors duration-200",
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
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <TaskTitle
                  task={task}
                  onOpen={() => onOpen(task.id)}
                  onRemoveMention={(i) => {
                    const title = removeTimeMention(task.title, i);
                    if (title) actions.update(task.id, { title });
                  }}
                />
                {task.tags.map((tag) => (
                  <span key={tag} className="font-mono text-xs text-ash">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {task.durationMin > 0 ? (
                  <DurationRule minutes={task.durationMin} label={range} done={task.done} />
                ) : (
                  <button
                    type="button"
                    onClick={() => editor.edit(task.id)}
                    title="No duration yet. Write ~45m (or a range like 13:30 to 15:30) in the Line, or set it here."
                    className="press rounded-sm font-mono text-[11px] text-ash-dim transition-colors hover:text-sodium-soft focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
                  >
                    + set duration
                  </button>
                )}
                <PriorityBars priority={task.priority} />
              </div>
            </div>

            <div className="ml-2 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              <DeleteButton label="Delete task" onConfirm={remove} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
