"use client";

import { Check, ListChecks, NotebookText } from "lucide-react";
import { HoverCard } from "radix-ui";
import { cn } from "@/lib/utils";
import type { Task } from "@/features/tasks/domain/task";

const SHOWN_STEPS = 6;

/**
 * A quiet hint that a task holds more than its title: the step count and a note
 * mark. Hovering shows the steps and the note; a click (or a tap, where there is
 * no hover) opens the task, as the title does.
 */
export function TaskExtras({ task, onOpen }: { task: Task; onOpen(): void }) {
  const note = task.note.trim();
  const total = task.steps.length;
  if (total === 0 && note === "") return null;

  const done = task.steps.filter((s) => s.done).length;
  const label = [
    total > 0 && `${done} of ${total} steps done`,
    note !== "" && "has a note",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <HoverCard.Root openDelay={250} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${label}. Open the task`}
          className="press inline-flex h-5 items-center gap-2 rounded-[6px] px-1 font-mono text-[11px] text-ash-dim transition-colors hover:bg-raise hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none data-[state=open]:bg-raise data-[state=open]:text-bone"
        >
          {total > 0 && (
            <span className={cn("inline-flex items-center gap-1", done === total && "text-moss")}>
              <ListChecks aria-hidden="true" className="size-3.5" />
              {done}/{total}
            </span>
          )}
          {note !== "" && <NotebookText aria-hidden="true" className="size-3.5" />}
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 flex w-[300px] origin-(--radix-hover-card-content-transform-origin) flex-col gap-3 rounded-[14px] border border-line bg-raise p-3.5 shadow-[0_18px_44px_color-mix(in_srgb,var(--color-shade)_45%,transparent)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-150"
        >
          {total > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="kicker">Steps</span>
                <span className="font-mono text-[11px] text-ash-dim">
                  {done}/{total}
                </span>
              </div>
              <div aria-hidden="true" className="flex gap-0.5">
                {task.steps.map((s) => (
                  <span
                    key={s.id}
                    className={cn("h-1 flex-1 rounded-[2px]", s.done ? "bg-moss" : "bg-line")}
                  />
                ))}
              </div>
              <ul className="flex flex-col gap-1.5">
                {task.steps.slice(0, SHOWN_STEPS).map((s) => (
                  <li key={s.id} className="flex items-start gap-2 text-[13px] leading-snug">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-[4px] border",
                        s.done ? "border-moss bg-moss text-ground" : "border-faint",
                      )}
                    >
                      {s.done && <Check className="size-2.5" strokeWidth={3} />}
                    </span>
                    <span className={cn("min-w-0 break-words", s.done ? "text-ash line-through" : "text-bone")}>
                      {s.title}
                    </span>
                  </li>
                ))}
              </ul>
              {total > SHOWN_STEPS && (
                <span className="font-mono text-[11px] text-ash-dim">
                  +{total - SHOWN_STEPS} more
                </span>
              )}
            </section>
          )}

          {note !== "" && (
            <section className={cn("flex flex-col gap-1.5", total > 0 && "border-t border-line pt-3")}>
              <span className="kicker">Note</span>
              <p className="line-clamp-5 text-[13px] leading-snug whitespace-pre-line text-ash">{note}</p>
            </section>
          )}

          <span className="font-mono text-[11px] text-ash-dim">Click to open the task</span>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
