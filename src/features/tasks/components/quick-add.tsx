"use client";

import { Calendar, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useRef, useState } from "react";
import { Chip } from "@/components/ds/chip";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/tasks/client/use-now";
import { useTaskActions } from "@/features/tasks/client/use-tasks";
import { parseLine } from "@/features/tasks/domain/parse-line";
import type { LineTokenKind } from "@/features/tasks/domain/parse-line";
import { defaultDateFor } from "@/features/tasks/domain/spine";
import type { Lens } from "@/features/tasks/domain/spine";
import { dayTitle, formatDuration, formatHM, toIsoDate } from "@/features/tasks/domain/time";

type Range = { date: string; startMin: number; durationMin: number };

export type QuickAddApi = {
  pending: Range | null;
  setPendingRange(range: Range | null): void;
  focus(): void;
};

type QuickAddState = QuickAddApi & {
  inputRef: React.RefObject<HTMLInputElement | null>;
};

const QuickAddContext = createContext<QuickAddState | null>(null);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Range | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <QuickAddContext.Provider
      value={{
        pending,
        inputRef,
        setPendingRange: setPending,
        focus: () => inputRef.current?.focus(),
      }}
    >
      {children}
    </QuickAddContext.Provider>
  );
}

function useQuickAddState(): QuickAddState {
  const state = useContext(QuickAddContext);
  if (!state) throw new Error("QuickAdd must be used inside QuickAddProvider");
  return state;
}

export function useQuickAdd(): QuickAddApi {
  const { pending, setPendingRange, focus } = useQuickAddState();
  return { pending, setPendingRange, focus };
}

const KIND_LABEL: Record<LineTokenKind, string> = {
  time: "time",
  duration: "for",
  priority: "priority",
  tag: "tag",
  day: "day",
};

const HINTS = ["15:30", "~45m", "!!", "#tag", "tomorrow"];

function describeRange(range: Range): string {
  const [y, m, d] = range.date.split("-").map(Number);
  const day = dayTitle(new Date(y, m - 1, d)).name.slice(0, 3);
  const end = range.startMin + range.durationMin;
  return `${day} ${d} · ${formatHM(range.startMin)} → ${formatHM(end)} · ${formatDuration(range.durationMin)}`;
}

export function QuickAdd() {
  const { pending, setPendingRange, inputRef } = useQuickAddState();
  const pathname = usePathname();
  const now = useNow();
  const actions = useTaskActions();
  const [text, setText] = useState("");
  const [needsTime, setNeedsTime] = useState(false);

  const isWeek = pathname === "/week";
  const lens: Lens = pathname === "/next" ? "next" : pathname === "/inbox" ? "inbox" : "today";
  // A range picked on the calendar only applies while the calendar is showing.
  const range = isWeek ? pending : null;
  const parsed = parseLine(text, toIsoDate(now ?? new Date(0)));

  const clear = () => {
    setText("");
    setPendingRange(null);
    setNeedsTime(false);
  };

  const submit = () => {
    const today = toIsoDate(new Date());
    const line = parseLine(text, today);
    if (!line.title) return;

    const startMin = range?.startMin ?? line.startMin;
    if (isWeek && startMin === null) {
      setNeedsTime(true);
      return;
    }

    actions.create({
      title: line.title,
      date: range?.date ?? line.date ?? (isWeek ? today : defaultDateFor(lens, today)),
      startMin,
      durationMin: range?.durationMin ?? line.durationMin,
      priority: line.priority,
      tag: line.tag,
    });
    clear();
  };

  return (
    <div className="fixed bottom-[120px] left-1/2 z-10 w-[min(680px,calc(100%-32px))] -translate-x-1/2 max-sm:bottom-[calc(16px+env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-3 rounded-panel border border-line bg-surface px-[18px] pt-4 pb-3 shadow-[0_22px_50px_rgb(0_0_0/0.55)] transition-[border-color,box-shadow] duration-200 focus-within:border-sodium/40 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-sodium)_8%,transparent),0_22px_50px_rgb(0_0_0/0.55)]">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="font-mono text-xl text-sodium">
            ›
          </span>
          <label htmlFor="quick-add-input" className="sr-only">
            New task
          </label>
          <input
            id="quick-add-input"
            ref={inputRef}
            value={text}
            autoComplete="off"
            spellCheck={false}
            placeholder={
              range
                ? "What will you do in this block?"
                : "Add a task… try: Review PR 15:30 ~45m !! #work"
            }
            onChange={(e) => {
              setText(e.target.value);
              setNeedsTime(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                clear();
              }
            }}
            className="w-full bg-transparent text-[18px] caret-sodium outline-none placeholder:text-ash-dim"
          />
          <span
            className={cn(
              "font-mono text-[11px] whitespace-nowrap transition-colors",
              parsed.title ? "text-sodium" : "text-faint",
            )}
          >
            ↵ create
          </span>
        </div>

        <div className="flex min-h-[26px] flex-wrap items-center gap-1.5 pl-7">
          {range && (
            <div className="flex items-center gap-1">
              <Chip tone="sodium">
                <Calendar className="size-3.5" aria-hidden="true" />
                {describeRange(range)}
              </Chip>
              <button
                type="button"
                aria-label="Remove block"
                onClick={() => setPendingRange(null)}
                className="press grid size-7 place-items-center rounded-chip text-ash transition-colors hover:text-bone"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          {text.trim() === ""
            ? !range && HINTS.map((hint) => <Chip key={hint} tone="hint">{hint}</Chip>)
            : parsed.tokens.map((token) => (
                <Chip
                  key={token.kind}
                  tone={token.kind === "time" || token.kind === "day" ? "sodium" : "neutral"}
                  kind={KIND_LABEL[token.kind]}
                >
                  {token.label}
                </Chip>
              ))}
        </div>

        {needsTime && (
          <p role="status" className="pl-7 font-mono text-[11px] text-ash-dim">
            Missing a time: select a block or type a time like 15:30.
          </p>
        )}
      </div>
    </div>
  );
}
