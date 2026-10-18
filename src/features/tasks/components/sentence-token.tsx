"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Priority } from "@/features/tasks/domain/task";
import { addDays, formatDuration, formatHM } from "@/features/tasks/domain/time";

const TAG_PATTERN = /^[\p{L}\d_-]{1,32}$/u;

export function SentenceToken({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-sm border-b-[1.5px] border-dashed border-faint px-0.5 text-bone transition-colors focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none",
            open && "border-solid border-sodium text-sodium-soft",
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-3 p-3 text-sm">
        {typeof children === "function" ? children(() => setOpen(false)) : children}
      </PopoverContent>
    </Popover>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press h-9 rounded-control border px-3 font-mono text-[13px] transition-colors",
        active
          ? "border-sodium bg-sodium/10 text-sodium-soft"
          : "border-line text-bone hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

export function DayEditor({
  date,
  today,
  onChange,
  close,
}: {
  date: string | null;
  today: string;
  onChange(date: string | null): void;
  close(): void;
}) {
  const tomorrow = addDays(today, 1);
  const pick = (value: string | null) => {
    onChange(value);
    close();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Choice active={date === today} onClick={() => pick(today)}>
          Today
        </Choice>
        <Choice active={date === tomorrow} onClick={() => pick(tomorrow)}>
          Tomorrow
        </Choice>
        <Choice active={date === null} onClick={() => pick(null)}>
          No date
        </Choice>
      </div>
      <Input
        type="date"
        aria-label="Pick a date"
        value={date ?? ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </>
  );
}

export function TimeEditor({
  startMin,
  onChange,
}: {
  startMin: number | null;
  onChange(startMin: number | null): void;
}) {
  return (
    <>
      <Input
        type="time"
        step={300}
        aria-label="Start time"
        value={startMin === null ? "" : formatHM(startMin)}
        onChange={(e) => {
          const [h, m] = e.target.value.split(":").map(Number);
          onChange(e.target.value ? h * 60 + m : null);
        }}
      />
      {startMin !== null && <Choice onClick={() => onChange(null)}>No time</Choice>}
    </>
  );
}

const DURATION_SHORTCUTS = [
  { minutes: 15, label: "15m" },
  { minutes: 30, label: "30m" },
  { minutes: 45, label: "45m" },
  { minutes: 60, label: "1h" },
];

export function DurationEditor({
  minutes,
  startMin,
  onChange,
}: {
  minutes: number;
  startMin: number | null;
  onChange(minutes: number): void;
}) {
  const summary =
    minutes === 0
      ? "No duration"
      : startMin === null
        ? formatDuration(minutes)
        : `Ends ${formatHM((startMin + minutes) % 1440)}`;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {DURATION_SHORTCUTS.map((shortcut) => (
          <Choice
            key={shortcut.minutes}
            active={minutes === shortcut.minutes}
            onClick={() => onChange(shortcut.minutes)}
          >
            {shortcut.label}
          </Choice>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={5}
          max={240}
          step={5}
          aria-label="Duration in minutes"
          value={Math.min(Math.max(minutes, 5), 240)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-sodium"
        />
        <span className="w-20 text-right font-mono text-xs text-ash">{summary}</span>
      </div>
      {minutes > 0 && <Choice onClick={() => onChange(0)}>No duration</Choice>}
    </>
  );
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 0, label: "None" },
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
];

export function PriorityEditor({
  priority,
  onChange,
  close,
}: {
  priority: Priority;
  onChange(priority: Priority): void;
  close(): void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRIORITIES.map((item) => (
        <Choice
          key={item.value}
          active={priority === item.value}
          onClick={() => {
            onChange(item.value);
            close();
          }}
        >
          {item.label}
        </Choice>
      ))}
    </div>
  );
}

export function TagEditor({
  tag,
  onChange,
  close,
}: {
  tag: string | null;
  onChange(tag: string | null): void;
  close(): void;
}) {
  const [value, setValue] = useState(tag ?? "");

  const commit = () => {
    const clean = value.trim().replace(/^#/, "").toLowerCase();
    if (clean === "") onChange(null);
    else if (TAG_PATTERN.test(clean)) onChange(clean);
    else return false;
    return true;
  };

  return (
    <Input
      aria-label="Tag"
      placeholder="work"
      value={value}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && commit()) close();
      }}
      onBlur={commit}
    />
  );
}
