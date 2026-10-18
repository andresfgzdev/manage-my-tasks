import { parseLine } from "./parse-line.ts";
import type { ParsedLine } from "./parse-line.ts";
import { defaultDateFor, lensOf } from "./spine.ts";
import type { Lens } from "./spine.ts";
import { PRIORITY_NAMES } from "./task.ts";
import type { TaskDraft } from "./task.ts";
import { formatDuration, formatHM, relativeDay } from "./time.ts";

/** A range picked on the Week calendar, waiting for a title. */
export type Block = { date: string; startMin: number; durationMin: number };

/** Where the Line is typed: a lens, or Week with the block picked there (if any). */
export type LineWhere = { view: Lens } | { view: "week"; block: Block | null };

export type Placement = {
  line: ParsedLine;
  /** The task to create; null while there is no title, or on Week without a time. */
  draft: TaskDraft | null;
  /** The lens the new task will show in. */
  lands: Lens | null;
  /** On Week a task needs a time: typed, or from the block. */
  needsTime: boolean;
};

/**
 * What The Line makes of `text` typed at `where`. The block wins over typed
 * times; without a day the task goes to the view it was typed in.
 */
export function placeLine(text: string, today: string, where: LineWhere): Placement {
  const line = parseLine(text, today);
  const block = where.view === "week" ? where.block : null;
  const startMin = block?.startMin ?? line.startMin;
  const needsTime = where.view === "week" && startMin === null && line.title !== "";
  if (line.title === "" || needsTime) return { line, draft: null, lands: null, needsTime };

  const date =
    block?.date ?? line.date ?? (where.view === "week" ? today : defaultDateFor(where.view, today));
  const draft: TaskDraft = {
    title: line.title,
    date,
    startMin,
    durationMin: block?.durationMin ?? line.durationMin,
    priority: line.priority,
    tags: line.tags,
  };
  return { line, draft, lands: lensOf({ date, done: false }, today), needsTime: false };
}

/** "tomorrow from 11:00 to 12:30, high priority, tagged work and home". */
export function describeDraft(draft: TaskDraft, today: string): string {
  const { date = null, startMin = null, durationMin = 0, priority = 0, tags = [] } = draft;
  const day = relativeDay(date, today);
  let when = date === null ? "with no day" : day === "today" || day === "tomorrow" ? day : `on ${day}`;
  if (startMin !== null) {
    when +=
      durationMin > 0
        ? ` from ${formatHM(startMin)} to ${formatHM((startMin + durationMin) % 1440)}`
        : ` at ${formatHM(startMin)}`;
  } else if (durationMin > 0) {
    when += `, for ${formatDuration(durationMin)}`;
  }

  const parts = [when];
  if (priority > 0) parts.push(`${PRIORITY_NAMES[priority]} priority`);
  if (tags.length > 0) {
    parts.push(
      `tagged ${tags.length === 1 ? tags[0] : `${tags.slice(0, -1).join(", ")} and ${tags.at(-1)}`}`,
    );
  }
  return parts.join(", ");
}
