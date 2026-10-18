"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DURATION_SHORTCUTS,
  PRIORITY_CHOICES,
  formatTags,
  readTags,
  readTimeText,
} from "@/features/tasks/domain/edit";
import type { Priority } from "@/features/tasks/domain/task";
import { addDays, formatDuration, formatHM } from "@/features/tasks/domain/time";

/**
 * A field edited locally and saved once: on blur, on Enter, or when the popover
 * closes. Inputs that fire on every keystroke or drag step stay off the network.
 */
function useDraft<T>(value: T, commit: (value: T) => void) {
  const [draft, setDraft] = useState(value);
  const latest = useRef({ draft, value, commit });
  useEffect(() => {
    latest.current = { draft, value, commit };
  });
  const flush = () => {
    const current = latest.current;
    if (current.draft !== current.value) {
      current.value = current.draft;
      current.commit(current.draft);
    }
  };
  // Closing the popover unmounts the editor without a blur.
  useEffect(
    () => () => {
      const current = latest.current;
      if (current.draft !== current.value) current.commit(current.draft);
    },
    [],
  );
  return [draft, setDraft, flush] as const;
}

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
  const [text, setText, flush] = useDraft(startMin === null ? "" : formatHM(startMin), (value) =>
    onChange(readTimeText(value)),
  );

  return (
    <>
      <Input
        type="time"
        step={300}
        aria-label="Start time"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={flush}
        onKeyDown={(e) => e.key === "Enter" && flush()}
      />
      {startMin !== null && <Choice onClick={() => onChange(null)}>No time</Choice>}
    </>
  );
}

export function DurationEditor({
  minutes,
  startMin,
  onChange,
}: {
  minutes: number;
  startMin: number | null;
  onChange(minutes: number): void;
}) {
  // The slider moves in 5 minute steps: each one shows, only the last one is saved.
  const [draft, setDraft, flush] = useDraft(minutes, onChange);
  const pick = (value: number) => {
    setDraft(value);
    onChange(value);
  };
  const summary =
    draft === 0
      ? "No duration"
      : startMin === null
        ? formatDuration(draft)
        : `Ends ${formatHM((startMin + draft) % 1440)}`;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {DURATION_SHORTCUTS.map((shortcut) => (
          <Choice
            key={shortcut.minutes}
            active={draft === shortcut.minutes}
            onClick={() => pick(shortcut.minutes)}
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
          value={Math.min(Math.max(draft, 5), 240)}
          onChange={(e) => setDraft(Number(e.target.value))}
          onPointerUp={flush}
          onKeyUp={flush}
          onBlur={flush}
          className="h-1 flex-1 cursor-pointer accent-sodium"
        />
        <span className="w-20 text-right font-mono text-xs text-ash">{summary}</span>
      </div>
      {draft > 0 && <Choice onClick={() => pick(0)}>No duration</Choice>}
    </>
  );
}

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
      {PRIORITY_CHOICES.map((item) => (
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
  tags,
  onChange,
  close,
}: {
  tags: string[];
  onChange(tags: string[]): void;
  close(): void;
}) {
  const [value, setValue] = useState(formatTags(tags));

  const commit = () => {
    const next = readTags(value);
    if (next.join() !== tags.join()) onChange(next);
  };

  return (
    <>
      <Input
        aria-label="Tags"
        placeholder="work, home"
        value={value}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            close();
          }
        }}
        onBlur={commit}
      />
      <p className="font-mono text-[11px] text-ash-dim">Separate tags with commas or spaces.</p>
    </>
  );
}
