"use client";

import { CalendarDays, Clock, Hash, Hourglass } from "lucide-react";
import { useRef } from "react";
import { PriorityBars } from "@/components/ds/priority-bars";
import { cn } from "@/lib/utils";
import type { ParsedLine, PickableKind } from "@/features/tasks/domain/parse-line";
import type { Priority } from "@/features/tasks/domain/task";
import { PRIORITY_NAMES } from "@/features/tasks/domain/task";
import { addDays, formatHM } from "@/features/tasks/domain/time";

const DURATIONS = [
  { word: "~15m", label: "15m", minutes: 15 },
  { word: "~30m", label: "30m", minutes: 30 },
  { word: "~1h", label: "1h", minutes: 60 },
  { word: "~2h", label: "2h", minutes: 120 },
];

/** A pick keeps the Line focused, so the keyboard stays up while tapping. */
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

function Pick({
  on,
  onPick,
  label,
  children,
}: {
  on?: boolean;
  onPick(): void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onMouseDown={keepFocus}
      onClick={onPick}
      className={cn(
        "press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none",
        on ? "border-sodium/50 bg-sodium/15 text-sodium-soft" : "border-line bg-raise text-bone",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line" />;

/**
 * Touch only: labelled buttons for what the Line's syntax does, for people who
 * will not type "~45m !!" on a phone keyboard. Every pick edits the text itself.
 */
export function LinePicks({
  line,
  today,
  onSet,
  onTag,
}: {
  line: ParsedLine;
  today: string;
  onSet(kind: PickableKind, word: string | null): void;
  onTag(): void;
}) {
  const timeRef = useRef<HTMLInputElement>(null);
  const tomorrow = addDays(today, 1);
  const isToday = line.date === today && line.tokens.some((t) => t.kind === "day");
  const isTomorrow = line.date === tomorrow;
  const nextPriority = ((line.priority + 1) % 4) as Priority;

  const openTime = () => {
    const input = timeRef.current;
    if (!input) return;
    input.value = line.startMin === null ? "" : formatHM(line.startMin);
    // iOS opens its wheel on focus; Chrome on Android needs showPicker.
    input.focus();
    try {
      input.showPicker();
    } catch {}
  };

  return (
    <div
      role="group"
      aria-label="Quick picks"
      // The faded right edge says there is more to scroll to.
      className="-mx-[18px] flex items-center gap-1.5 overflow-x-auto px-[18px] pb-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] [scrollbar-width:none]"
    >
      <Pick on={isToday} onPick={() => onSet("day", isToday ? null : "today")}>
        <CalendarDays aria-hidden="true" className="size-3.5" />
        Today
      </Pick>
      <Pick on={isTomorrow} onPick={() => onSet("day", isTomorrow ? null : "tomorrow")}>
        Tomorrow
      </Pick>
      <Divider />

      <span className="relative shrink-0">
        <Pick on={line.startMin !== null} onPick={openTime}>
          <Clock aria-hidden="true" className="size-3.5" />
          {line.startMin === null ? "Time" : formatHM(line.startMin)}
        </Pick>
        {/* The native time wheel: it writes "15:30" into the Line. */}
        <input
          ref={timeRef}
          type="time"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => e.target.value && onSet("time", e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </span>
      {line.startMin !== null && (
        <Pick label="Remove the time" onPick={() => onSet("time", null)}>
          ×
        </Pick>
      )}
      <Divider />

      <Hourglass aria-hidden="true" className="size-3.5 shrink-0 text-ash-dim" />
      {DURATIONS.map((d) => {
        const on = line.durationMin === d.minutes;
        return (
          <Pick
            key={d.word}
            on={on}
            label={`Lasts ${d.label}`}
            onPick={() => onSet("duration", on ? null : d.word)}
          >
            {d.label}
          </Pick>
        );
      })}
      <Divider />

      <Pick
        on={line.priority > 0}
        label={`Priority: ${PRIORITY_NAMES[line.priority]}. Tap for ${PRIORITY_NAMES[nextPriority]}`}
        onPick={() => onSet("priority", nextPriority === 0 ? null : "!".repeat(nextPriority))}
      >
        <PriorityBars priority={line.priority} />
        {line.priority === 0 ? "Priority" : PRIORITY_NAMES[line.priority]}
      </Pick>
      <Pick onPick={onTag}>
        <Hash aria-hidden="true" className="size-3.5" />
        Tag
      </Pick>
    </div>
  );
}
