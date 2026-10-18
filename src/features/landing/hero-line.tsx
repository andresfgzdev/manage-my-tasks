"use client";

import { useState } from "react";
import { useNow } from "@/features/tasks/client/use-now";
import { placeLine } from "@/features/tasks/domain/line";
import { dayTitle, formatDuration, formatRange } from "@/features/tasks/domain/time";
import { Chips, DaySketch, FALLBACK_NOW, SAMPLE_DAY, type SpineTask } from "./fragments";

const EXAMPLE = "Review PR 15:30 ~45m !! #work";
const TODAY = "2026-01-01";

/** The hero: the real parser from the app, placing whatever is typed on the visitor's own day. */
export function HeroLine() {
  const [text, setText] = useState(EXAMPLE);
  const clock = useNow();
  const now = clock
    ? { minute: clock.minute, label: `${dayTitle(clock.date).name}, ${dayTitle(clock.date).num}` }
    : FALLBACK_NOW;
  // The hero is a Today window: the same rules as the app's Line on /today.
  const { line, draft, lands } = placeLine(text, TODAY, { view: "today" });

  const startMin = draft?.startMin ?? null;
  const duration = draft?.durationMin || 30;
  const fresh: SpineTask | null =
    draft && lands === "today" && startMin !== null
      ? {
          // A new id per slot replays the landing move when the slot changes.
          id: `fresh-${startMin}-${duration}`,
          title: draft.title,
          startMin,
          durationMin: duration,
          priority: line.priority,
          tags: line.tags,
          fresh: true,
        }
      : null;

  const fromH = Math.min(8, fresh ? Math.floor(fresh.startMin / 60) : 8, Math.floor(now.minute / 60));
  const toH = Math.min(
    24,
    Math.max(20, fresh ? Math.ceil((fresh.startMin + fresh.durationMin) / 60) : 20, Math.floor(now.minute / 60) + 1),
  );
  const span = toH - fromH;

  let readout: string;
  if (!draft) readout = "Type a task to see where it goes.";
  else if (lands === "next")
    readout = startMin === null ? "Set for tomorrow, so it goes to Next." : `Tomorrow, ${formatRange(startMin, duration)}. It goes to Next.`;
  else if (startMin === null) readout = "Today, with no hour set yet. Typed in the Inbox, it would wait there.";
  else {
    const diff = startMin - now.minute;
    const when = formatRange(startMin, duration);
    readout =
      diff > 0
        ? `${when}, starting in ${formatDuration(diff)}.`
        : `${when}, earlier than now, so it shows as late.`;
  }

  return (
    <div className="ui-win ui-hero" data-ui>
      <div className="ui-win__head">
        <strong>Today</strong>
        <span>{now.label}</span>
      </div>
      <label className="ui-line" htmlFor="the-line">
        <span className="sr-only">Write a task in one line</span>
        <input
          id="the-line"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Call 13:30 to 15:30 #work,home"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <Chips tokens={line.tokens} />
      <div className="ui-hero__spine">
        <DaySketch
          tasks={fresh ? [...SAMPLE_DAY, fresh] : SAMPLE_DAY}
          nowMin={now.minute}
          fromH={fromH}
          toH={toH}
          hourPx={Math.round(408 / span)}
        />
      </div>
      <p className="ui-hero__readout" aria-live="polite">
        <span key={readout}>{readout}</span>
      </p>
    </div>
  );
}
