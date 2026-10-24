"use client";

import { useState } from "react";
import { parseLine } from "@/features/tasks/domain/parse-line";
import { formatDuration, formatRange } from "@/features/tasks/domain/time";
import { Chips, DaySpine, SAMPLE_DAY, type SpineTask } from "./fragments";
import { useNow } from "./use-now";

const EXAMPLE = "Review PR 15:30 ~45m !! #work";
const TODAY = "2026-01-01";

/** The hero: the real parser from the app, placing whatever is typed on the visitor's own day. */
export function HeroLine() {
  const [text, setText] = useState(EXAMPLE);
  const now = useNow();
  const line = parseLine(text, TODAY);

  const duration = line.durationMin || 30;
  const placed = line.startMin !== null && line.date === TODAY && line.title.length > 0;
  const fresh: SpineTask | null = placed
    ? {
        // A new id per slot replays the landing move when the slot changes.
        id: `fresh-${line.startMin}-${duration}`,
        title: line.title,
        startMin: line.startMin!,
        durationMin: duration,
        priority: line.priority,
        tags: line.tags,
        fresh: true,
      }
    : null;

  const fromH = Math.min(8, fresh ? Math.floor(fresh.startMin / 60) : 8, Math.floor(now.min / 60));
  const toH = Math.min(
    24,
    Math.max(20, fresh ? Math.ceil((fresh.startMin + fresh.durationMin) / 60) : 20, Math.floor(now.min / 60) + 1),
  );
  const span = toH - fromH;

  let readout: string;
  if (!line.title) readout = "Type a task to see where it goes.";
  else if (line.date && line.date !== TODAY)
    readout = line.startMin === null ? "Set for tomorrow, so it goes to Next." : `Tomorrow, ${formatRange(line.startMin, duration)}. It goes to Next.`;
  else if (line.startMin === null) readout = line.date ? "Today, with no hour set yet." : "No time or day in that line, so it would wait in the Inbox.";
  else {
    const diff = line.startMin - now.min;
    const when = formatRange(line.startMin, duration);
    readout =
      diff > 0
        ? `${when}, starting in ${formatDuration(diff)}.`
        : `${when}, earlier than now, so it shows as late.`;
  }

  return (
    <div className="ui-win ui-hero" data-ui>
      <div className="ui-win__head">
        <strong>Today</strong>
        <span suppressHydrationWarning>{now.label}</span>
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
        <DaySpine
          tasks={fresh ? [...SAMPLE_DAY, fresh] : SAMPLE_DAY}
          nowMin={now.min}
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
