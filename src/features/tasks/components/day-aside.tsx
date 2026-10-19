"use client";

import { CircleHelp, PanelRight, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useMemo, useRef, useState } from "react";
import { Credits } from "@/components/ds/credits";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/tasks/client/use-now";
import { useTasks } from "@/features/tasks/client/use-tasks";
import { hourPlan } from "@/features/tasks/domain/spine";
import { formatDuration, formatHM } from "@/features/tasks/domain/time";
import { LineGuide } from "./line-guide";
import { useQuickAdd } from "./quick-add";

const FROM_HOUR = 7;
const TO_HOUR = 23;
const AXIS = [7, 12, 17, 22];

function Help({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="What is this?"
          className="grid size-5 place-items-center rounded-full text-ash-dim transition-colors hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
        >
          <CircleHelp className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[240px] text-[12px] leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

const hourLabel = (h: number) => formatHM(h * 60);

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn("size-2 rounded-[2px]", color)} />
      {children}
    </span>
  );
}

function Rhythm() {
  const now = useNow();
  const { tasks } = useTasks();
  const today = now?.today ?? null;
  const plan = useMemo(
    () => (today ? hourPlan(tasks, today, FROM_HOUR, TO_HOUR) : []),
    [tasks, today],
  );

  if (!now) return <div className="h-[118px]" />;

  const planned = plan.reduce((sum, p) => sum + p.minutes, 0);
  const busiest = Math.max(60, ...plan.map((p) => p.minutes));
  const currentHour = Math.floor(now.minute / 60);
  const nextFree = plan.findIndex((p, i) => p.blocks === 0 && FROM_HOUR + i >= currentHour);

  return (
    <>
      <div className="flex h-14 items-end gap-[3px]" role="img" aria-label="Workload by hour">
        {plan.map((slot, i) => {
          const hour = FROM_HOUR + i;
          return (
            <Tooltip key={hour}>
              <TooltipTrigger asChild>
                <span className="group/bar flex h-full flex-1 cursor-default items-end">
                  <span
                    className={cn(
                      "w-full origin-bottom animate-fade-in rounded-[2px] transition-[height,background-color,transform] duration-300 ease-out-strong group-hover/bar:scale-y-[1.08]",
                      hour === currentHour
                        ? "bg-sodium"
                        : slot.blocks > 0
                          ? "bg-ash/70 group-hover/bar:bg-ash"
                          : "bg-raise group-hover/bar:bg-line",
                    )}
                    style={{ height: 6 + (slot.minutes / busiest) * 44 }}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-[11px]">
                {hourLabel(hour)} · {slot.blocks === 0 ? "free" : formatDuration(slot.minutes)}
                {slot.blocks > 1 && ` · ${slot.blocks} overlap`}
                {hour === currentHour && " · now"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="relative h-4 font-mono text-[11px] text-ash-dim" aria-hidden="true">
        {AXIS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2"
            style={{ left: `${((h - FROM_HOUR + 0.5) / (TO_HOUR - FROM_HOUR)) * 100}%` }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[11px] text-ash-dim">
        <Legend color="bg-sodium">now</Legend>
        <Legend color="bg-ash/70">booked</Legend>
        <Legend color="bg-raise">free</Legend>
      </div>

      <p className="font-mono text-[12px] text-ash">
        <span className="text-bone">{formatDuration(planned) || "Nothing"}</span> booked
        {nextFree >= 0 && <> · next free {hourLabel(FROM_HOUR + nextFree)}</>}
      </p>
    </>
  );
}

function GuideCard({ onPick }: { onPick?(): void }) {
  return (
    <LineGuide onPick={onPick}>
      <button
        type="button"
        className="press group/guide flex items-center gap-3 rounded-[12px] border border-dashed border-line px-3.5 py-3 text-left transition-colors hover:border-sodium/50 hover:bg-surface focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-line bg-raise font-mono text-[13px] text-sodium transition-colors group-hover/guide:border-sodium/40">
          ›_
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-medium text-bone">How to write a task</span>
          <span className="truncate font-mono text-[11px] text-ash-dim">15:30 ~45m !! #work tomorrow</span>
        </span>
      </button>
    </LineGuide>
  );
}

function AsideContent({ onPick }: { onPick?(): void }) {
  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="kicker">Today&apos;s rhythm</h2>
          <Help>
            Each bar is one hour of today, 07:00 to 22:00. Taller means more of that hour is
            booked. Hover a bar for the details.
          </Help>
        </div>
        <Rhythm />
      </section>

      <GuideCard onPick={onPick} />
      <Credits className="mt-auto" />
    </>
  );
}

/** The Today sidebar, from lg up. Below that it moves into RhythmSheet. */
export function DayAside() {
  return (
    <aside className="sticky top-8 hidden w-[280px] shrink-0 flex-col gap-7 self-start pt-2 lg:flex">
      <AsideContent />
    </aside>
  );
}

/** Tablet and phone: the same sidebar slides in from the right instead of falling under the list. */
export function RhythmSheet() {
  const { focus } = useQuickAdd();
  const [open, setOpen] = useState(false);
  // A line picked from the guide closes the sheet too, and focus goes to the Line.
  const picked = useRef(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Today's rhythm"
          title="Today's rhythm"
          className="press grid size-9 shrink-0 place-items-center rounded-full border border-line bg-raise text-ash transition-colors hover:border-faint hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none lg:hidden"
        >
          <PanelRight className="size-[17px]" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ground/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            if (!picked.current) return;
            e.preventDefault();
            picked.current = false;
            focus();
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(340px,calc(100%-48px))] flex-col gap-7 overflow-y-auto border-l border-line bg-ground px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[-24px_0_60px_color-mix(in_srgb,var(--color-shade)_45%,transparent)] outline-none data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:ease-in data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-out-strong data-[state=open]:slide-in-from-right"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Your day</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="press grid size-8 place-items-center rounded-full text-ash transition-colors hover:bg-raise hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <AsideContent
            onPick={() => {
              picked.current = true;
              setOpen(false);
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
