"use client";

import { CircleHelp } from "lucide-react";
import { useMemo } from "react";
import { PriorityBars } from "@/components/ds/priority-bars";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/tasks/client/use-now";
import { useTasks } from "@/features/tasks/client/use-tasks";
import { hourPlan } from "@/features/tasks/domain/spine";
import { formatDuration, formatHM } from "@/features/tasks/domain/time";
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

const SYNTAX: {
  tokens: string[];
  name: string;
  hint: string;
  detail: string;
  extra?: React.ReactNode;
}[] = [
  {
    tokens: ["15:30", "3pm"],
    name: "Starts at",
    hint: "The start time",
    detail: "Sets when it starts and keeps the time in the text. A range works too: 13:30 to 15:30.",
  },
  {
    tokens: ["~45m", "~2h"],
    name: "Lasts",
    hint: "How long it takes",
    detail: "Write ~ then minutes or hours. A range like 13:30 to 15:30 sets the duration for you.",
  },
  {
    tokens: ["!", "!!", "!!!"],
    name: "Priority",
    hint: "Low, medium or high",
    detail: "One, two or three exclamation marks.",
    extra: <PriorityBars priority={2} />,
  },
  {
    tokens: ["#work,home"],
    name: "Tags",
    hint: "One or more tags",
    detail: "Separate several tags with commas: #work,home makes two tags.",
  },
  {
    tokens: ["today", "tomorrow"],
    name: "Day",
    hint: "When to do it",
    detail: "Without a day, it goes to the view you are on.",
  },
];

const EXAMPLE = "Review PR 15:30 ~45m !! #work";

function LineSyntax() {
  const { insert } = useQuickAdd();

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between pb-1">
        <h2 className="kicker">How to write a task</h2>
        <Help>Type these anywhere in the Line, in any order. Click a row to add it.</Help>
      </div>
      <p className="pb-2.5 text-[12px] leading-snug text-ash-dim">
        Add them anywhere in the Line. Click one to insert it.
      </p>

      {SYNTAX.map((row) => (
        <Tooltip key={row.name}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => insert(`${row.tokens[0]} `)}
              className="press group/row -mx-2 flex items-start justify-between gap-3 rounded-[9px] border-b border-raise px-2 py-2 text-left text-[13px] transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
            >
              <span className="flex flex-wrap gap-1">
                {row.tokens.map((token) => (
                  <code
                    key={token}
                    className="rounded-chip border border-line bg-raise px-1.5 py-0.5 font-mono text-[12px] text-bone transition-colors group-hover/row:border-sodium/40"
                  >
                    {token}
                  </code>
                ))}
              </span>
              <span className="flex items-center gap-2 text-right text-ash">
                {row.extra}
                {row.name}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[260px] text-[12px] leading-snug">
            <strong className="font-semibold">{row.hint}.</strong> {row.detail}
          </TooltipContent>
        </Tooltip>
      ))}

      <button
        type="button"
        onClick={() => insert(`${EXAMPLE} `)}
        className="press mt-3 flex flex-col items-start gap-1 rounded-[10px] border border-dashed border-line px-3 py-2.5 text-left transition-colors hover:border-sodium/50 hover:bg-surface focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
      >
        <span className="kicker">Try an example</span>
        <span className="font-mono text-[12px] text-bone">{EXAMPLE}</span>
        <span className="text-[11px] text-ash-dim">
          Today at 15:30, for 45 min, medium priority, tagged #work.
        </span>
      </button>
    </section>
  );
}

export function DayAside() {
  return (
    <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-8 pt-2">
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

      <LineSyntax />
    </aside>
  );
}
