"use client";

import { ArrowUp, Calendar, Check, CircleHelp, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/ds/chip";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/tasks/client/use-now";
import { useIsTouch, useKeyboardInset } from "@/features/tasks/client/use-touch";
import { useTaskActions } from "@/features/tasks/client/use-tasks";
import { placeLine } from "@/features/tasks/domain/line";
import type { Block, LineWhere } from "@/features/tasks/domain/line";
import { TOKEN_KIND_LABELS, setLineWord } from "@/features/tasks/domain/parse-line";
import type { PickableKind } from "@/features/tasks/domain/parse-line";
import type { Lens } from "@/features/tasks/domain/spine";
import { formatBlock, toIsoDate } from "@/features/tasks/domain/time";
import { LineGuide } from "./line-guide";
import { LinePicks } from "./line-picks";

export type QuickAddApi = {
  pending: Block | null;
  setPendingRange(range: Block | null): void;
  focus(): void;
  /** Appends a piece of Line syntax to the input (the cheat sheet and hint chips use it). */
  insert(snippet: string): void;
};

type QuickAddState = QuickAddApi & {
  inputRef: React.RefObject<HTMLInputElement | null>;
  // The Line owns its text; it registers how to append to it here, so typing
  // never re-renders the views that only need `insert`.
  insertRef: React.RefObject<(snippet: string) => void>;
};

const QuickAddContext = createContext<QuickAddState | null>(null);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Block | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const insertRef = useRef<(snippet: string) => void>(() => {});

  const value = useMemo<QuickAddState>(
    () => ({
      pending,
      inputRef,
      insertRef,
      setPendingRange: setPending,
      focus: () => inputRef.current?.focus(),
      insert: (snippet) => insertRef.current(snippet),
    }),
    [pending],
  );

  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>;
}

function useQuickAddState(): QuickAddState {
  const state = useContext(QuickAddContext);
  if (!state) throw new Error("QuickAdd must be used inside QuickAddProvider");
  return state;
}

export function useQuickAdd(): QuickAddApi {
  const { pending, setPendingRange, focus, insert } = useQuickAddState();
  return { pending, setPendingRange, focus, insert };
}

const HINTS = [
  { snippet: "15:30", title: "Start time, or a range like 13:30 to 15:30" },
  { snippet: "~45m", title: "Duration: ~45m, ~2h" },
  { snippet: "!!", title: "Priority: ! low, !! medium, !!! high" },
  { snippet: "#work,home", title: "Tags: separate several with commas" },
  { snippet: "tomorrow", title: "Day: today or tomorrow" },
];

const NOTICES = {
  "needs-time": "Missing a time: select a block or type a time like 15:30.",
  refused: "That task couldn't be saved, so it's back in the Line.",
};

const LENS_NAMES: Record<Lens, string> = { today: "Today", next: "Next", inbox: "the Inbox" };
const ADDED_MS = 2600;

/** Keeps the Line focused when a button in it is pressed: on a phone the keyboard stays up. */
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

export function QuickAdd() {
  const { pending, setPendingRange, inputRef, insertRef, insert } = useQuickAddState();
  const pathname = usePathname();
  const now = useNow();
  const actions = useTaskActions();
  const touch = useIsTouch();
  const keyboard = useKeyboardInset();
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<keyof typeof NOTICES | null>(null);
  const [added, setAdded] = useState<Lens | null>(null);

  const isWeek = pathname === "/week";
  const lens: Lens = pathname === "/next" ? "next" : pathname === "/inbox" ? "inbox" : "today";
  // A range picked on the calendar only applies while the calendar is showing.
  const range = isWeek ? pending : null;
  const where: LineWhere = isWeek ? { view: "week", block: range } : { view: lens };
  const today = now?.today ?? toIsoDate(new Date());
  const parsed = placeLine(text, today, where).line;
  const ready = parsed.title !== "";

  // The Line is ready as soon as the page opens; not on a phone, where focusing
  // would throw the keyboard over the day before anyone asked for it.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
  }, [inputRef]);
  useEffect(() => {
    insertRef.current = (snippet) => {
      setText((current) => (current && !current.endsWith(" ") ? `${current} ` : current) + snippet);
      inputRef.current?.focus();
    };
  }, [insertRef, inputRef]);
  // The landing's closing form opens /today?line=…: that line waits here, ready for Enter.
  useEffect(() => {
    const url = new URL(window.location.href);
    const line = url.searchParams.get("line");
    if (line === null) return;
    url.searchParams.delete("line");
    window.history.replaceState(window.history.state, "", url);
    insertRef.current(line.trim());
  }, [insertRef]);
  useEffect(() => {
    if (added === null) return;
    const timer = setTimeout(() => setAdded(null), ADDED_MS);
    return () => clearTimeout(timer);
  }, [added]);

  const clear = () => {
    setText("");
    setPendingRange(null);
    setNotice(null);
  };

  const submit = () => {
    const placement = placeLine(text, toIsoDate(new Date()), where);
    if (placement.needsTime) {
      setNotice("needs-time");
      return;
    }
    if (!placement.draft) {
      inputRef.current?.focus();
      return;
    }

    const typed = text;
    const { saved } = actions.create(placement.draft);
    clear();
    // Say where it went: on a phone the new row is often hidden under the keyboard.
    setAdded(placement.lands);
    void saved.then((ok) => {
      if (ok) return;
      // Give the words back unless something new was typed meanwhile.
      setText((current) => (current === "" ? typed : current));
      setAdded(null);
      setNotice("refused");
    });
  };

  const setWord = (kind: PickableKind, word: string | null) => {
    setText((current) => setLineWord(current, kind, word));
    setNotice(null);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      className="fixed bottom-[120px] left-1/2 z-10 w-[min(680px,calc(100%-32px))] -translate-x-1/2 transition-[margin] duration-200 ease-out-strong max-sm:bottom-[calc(16px+env(safe-area-inset-bottom))]"
      style={keyboard > 0 ? { marginBottom: keyboard } : undefined}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="group/line flex flex-col gap-3 rounded-panel border border-line bg-surface px-[18px] pt-4 pb-3 shadow-[0_22px_50px_color-mix(in_srgb,var(--color-shade)_55%,transparent)] transition-[border-color,box-shadow] duration-200 focus-within:border-sodium/40 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-sodium)_8%,transparent),0_22px_50px_color-mix(in_srgb,var(--color-shade)_55%,transparent)] pointer-coarse:pt-3"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="font-mono text-xl text-sodium pointer-coarse:hidden">
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
            autoCapitalize="sentences"
            spellCheck={false}
            enterKeyHint="done"
            placeholder={
              range
                ? "What will you do in this block?"
                : touch
                  ? "Add a task…"
                  : "Add a task… try: Review PR 15:30 ~45m !! #work"
            }
            onChange={(e) => {
              setText(e.target.value);
              setNotice(null);
              setAdded(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") clear();
            }}
            className="w-full min-w-0 bg-transparent text-[18px] caret-sodium outline-none placeholder:text-ash-dim"
          />
          {/* A real button: on a phone "press Enter" means nothing. */}
          <button
            type="submit"
            onMouseDown={keepFocus}
            aria-label="Create task"
            className={cn(
              "press shrink-0 transition-[background-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none",
              "pointer-fine:rounded-sm pointer-fine:font-mono pointer-fine:text-[11px] pointer-fine:whitespace-nowrap",
              "pointer-coarse:grid pointer-coarse:size-10 pointer-coarse:place-items-center pointer-coarse:rounded-full",
              ready
                ? "pointer-fine:text-sodium pointer-coarse:bg-sodium pointer-coarse:text-ground"
                : "pointer-fine:text-ash-dim pointer-coarse:bg-raise pointer-coarse:text-ash-dim",
            )}
          >
            <span className="pointer-coarse:hidden">↵ create</span>
            <ArrowUp aria-hidden="true" className="hidden size-5 pointer-coarse:block" strokeWidth={2.4} />
          </button>
        </div>

        <div
          className={cn(
            "flex min-h-[26px] flex-wrap items-center gap-1.5 pl-7 pointer-coarse:pl-0",
            // On touch the picks below do the teaching: this row only shows what was understood.
            parsed.tokens.length === 0 && !range && "pointer-coarse:hidden",
          )}
        >
          {range && (
            <div className="flex items-center gap-1">
              <Chip tone="sodium">
                <Calendar className="size-3.5" aria-hidden="true" />
                {formatBlock(range.date, range.startMin, range.durationMin)}
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
            ? !range &&
              HINTS.map((hint) => (
                <Chip
                  key={hint.snippet}
                  tone="hint"
                  title={hint.title}
                  onClick={() => insert(`${hint.snippet} `)}
                >
                  {hint.snippet}
                </Chip>
              ))
            : parsed.tokens.map((token) => (
                <Chip
                  key={`${token.kind}-${token.label}`}
                  tone={token.kind === "time" || token.kind === "day" ? "sodium" : "neutral"}
                  kind={TOKEN_KIND_LABELS[token.kind]}
                >
                  {token.label}
                </Chip>
              ))}
          {parsed.startMin !== null && parsed.durationMin === 0 && !range && !touch && (
            <Chip tone="hint" title="Add a duration, or write a range like 13:30 to 15:30" onClick={() => insert("~1h ")}>
              + add ~1h to set a duration
            </Chip>
          )}
          <LineGuide>
            <button
              type="button"
              aria-label="How to write a task"
              title="How to write a task"
              className="press ml-auto grid size-7 place-items-center rounded-full text-ash-dim transition-colors hover:bg-raise hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none pointer-coarse:hidden"
            >
              <CircleHelp className="size-4" />
            </button>
          </LineGuide>
        </div>

        {/* Touch: labelled picks while the Line is in use, instead of syntax to memorise. */}
        {touch && (
          <div className="hidden flex-col gap-2.5 group-focus-within/line:flex">
            <LinePicks line={parsed} today={today} onSet={setWord} onTag={() => insert("#")} />
            <LineGuide>
              <button
                type="button"
                onMouseDown={keepFocus}
                className="self-start rounded-sm font-mono text-[11px] text-ash-dim underline decoration-line underline-offset-[3px]"
              >
                Or type it: 15:30 ~45m !! #work tomorrow
              </button>
            </LineGuide>
          </div>
        )}

        {notice ? (
          <p role="status" className="animate-fade-in pl-7 font-mono text-[11px] text-ash-dim pointer-coarse:pl-0">
            {NOTICES[notice]}
          </p>
        ) : (
          added && (
            <p
              role="status"
              className="flex animate-fade-in items-center gap-1.5 pl-7 font-mono text-[11px] text-moss pointer-coarse:pl-0"
            >
              <Check aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
              Added to {LENS_NAMES[added]}
            </p>
          )
        )}
      </form>
    </div>
  );
}
