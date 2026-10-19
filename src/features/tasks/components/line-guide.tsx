"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import { PriorityBars } from "@/components/ds/priority-bars";
import { useQuickAdd } from "./quick-add";

const SYNTAX: {
  tokens: string[];
  name: string;
  detail: string;
  extra?: React.ReactNode;
}[] = [
  {
    tokens: ["15:30", "3pm"],
    name: "Starts at",
    detail: "Sets when it starts and keeps the time in the text. A range works too: 13:30 to 15:30.",
  },
  {
    tokens: ["~45m", "~2h"],
    name: "Lasts",
    detail: "Write ~ then minutes or hours. A range like 13:30 to 15:30 sets the duration for you.",
  },
  {
    tokens: ["!", "!!", "!!!"],
    name: "Priority",
    detail: "One, two or three exclamation marks: low, medium or high.",
    extra: <PriorityBars priority={2} />,
  },
  {
    tokens: ["#work,home"],
    name: "Tags",
    detail: "Separate several tags with commas: #work,home makes two tags.",
  },
  {
    tokens: ["today", "tomorrow"],
    name: "Day",
    detail: "Without a day, it goes to the view you are on.",
  },
];

const EXAMPLE = "Review PR 15:30 ~45m !! #work";

/**
 * The Line's cheat sheet, in a dialog: it used to live in the Today aside, where
 * it took more room than the day itself. `children` is the trigger; `onPick` lets a
 * surrounding panel close too, so the Line it writes into is in view.
 */
export function LineGuide({ children, onPick }: { children: React.ReactNode; onPick?(): void }) {
  const { insert } = useQuickAdd();
  const [open, setOpen] = useState(false);
  // What to add once the dialog has closed: while it is open its focus trap would
  // pull focus back from the Line.
  const picked = useRef<string | null>(null);

  const pick = (snippet: string) => {
    picked.current = snippet;
    setOpen(false);
    onPick?.();
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ground/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            if (picked.current === null) return;
            e.preventDefault();
            insert(picked.current);
            picked.current = null;
          }}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[min(520px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-panel border border-line bg-surface p-6 shadow-[0_30px_80px_color-mix(in_srgb,var(--color-shade)_60%,transparent)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 max-sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <Dialog.Title className="text-lg font-semibold">How to write a task</Dialog.Title>
              <Dialog.Description className="text-[13px] leading-snug text-ash">
                Type these anywhere in the Line, in any order. Click one to add it.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="press grid size-8 shrink-0 place-items-center rounded-full text-ash transition-colors hover:bg-raise hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex flex-col">
            {SYNTAX.map((row) => (
              <button
                key={row.name}
                type="button"
                onClick={() => pick(`${row.tokens[0]} `)}
                className="press group/row -mx-2 flex flex-col gap-1.5 rounded-[10px] border-b border-raise px-2 py-2.5 text-left transition-colors last:border-b-0 hover:bg-raise/60 focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
              >
                <span className="flex items-center justify-between gap-3">
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
                  <span className="flex items-center gap-2 text-[13px] text-bone">
                    {row.extra}
                    {row.name}
                  </span>
                </span>
                <span className="text-[12px] leading-snug text-ash-dim">{row.detail}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => pick(`${EXAMPLE} `)}
            className="press flex flex-col items-start gap-1 rounded-[10px] border border-dashed border-line px-3 py-2.5 text-left transition-colors hover:border-sodium/50 hover:bg-raise/60 focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
          >
            <span className="kicker">Try an example</span>
            <span className="font-mono text-[12px] text-bone">{EXAMPLE}</span>
            <span className="text-[11px] text-ash-dim">
              Today at 15:30, for 45 min, medium priority, tagged #work.
            </span>
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
