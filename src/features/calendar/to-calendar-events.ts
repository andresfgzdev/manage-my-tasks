import type { Task } from "../tasks/domain/task.ts";
import { addDays, formatHM, minuteOfDay, toIsoDate } from "../tasks/domain/time.ts";

// Plain data, deliberately free of FullCalendar types so it runs under node --test.
// How a tint or a done flag looks is decided in week-calendar.tsx.
export type Tint = "ice" | "moss" | "bone" | "neutral";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: { tint: Tint; done: boolean };
};

const TINTS: Record<string, Tint> = { study: "ice", personal: "moss", project: "bone" };

// "YYYY-MM-DDTHH:MM" in wall-clock time; minutes past 24:00 roll over to the next day.
function wallClock(date: string, min: number): string {
  return min >= 1440 ? `${addDays(date, 1)}T${formatHM(min - 1440)}` : `${date}T${formatHM(min)}`;
}

function tintOf(tags: string[]): Tint {
  for (const tag of tags) if (TINTS[tag]) return TINTS[tag];
  return "neutral";
}

export function toCalendarEvents(tasks: Task[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const task of tasks) {
    if (task.date === null || task.startMin === null) continue;
    events.push({
      id: task.id,
      title: task.title,
      start: wallClock(task.date, task.startMin),
      end: wallClock(task.date, task.startMin + Math.max(task.durationMin, 15)),
      extendedProps: { tint: tintOf(task.tags), done: task.done },
    });
  }
  return events;
}

const SNAP_MIN = 5;
const DEFAULT_BLOCK_MIN = 60;
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** A moved or resized block as task time fields: snapped to 5 minutes, never past midnight. */
export function fromRange(
  start: Date,
  end: Date,
): { date: string; startMin: number; durationMin: number } {
  const startMin = Math.min(roundTo(minuteOfDay(start), SNAP_MIN), 1439);
  const length = roundTo(Math.round((end.getTime() - start.getTime()) / 60000), SNAP_MIN);
  return {
    date: toIsoDate(start),
    startMin,
    durationMin: Math.max(SNAP_MIN, Math.min(length, 1440 - startMin)),
  };
}

/** A new selection: like `fromRange`, but a single click (one 15 minute slot) becomes an hour. */
export function fromSelection(start: Date, end: Date): ReturnType<typeof fromRange> {
  const clicked = end.getTime() - start.getTime() === 15 * 60000;
  return fromRange(start, clicked ? new Date(start.getTime() + DEFAULT_BLOCK_MIN * 60000) : end);
}

/**
 * What the week header and day headers add up: the minutes of the blocks the
 * calendar draws (dated and timed tasks), for the week and for each day.
 */
export function weekTotals(
  tasks: Task[],
  from: string,
  to: string,
): { plannedMin: number; byDate: Record<string, number> } {
  const byDate: Record<string, number> = {};
  let plannedMin = 0;
  for (const t of tasks) {
    if (t.date === null || t.startMin === null || t.date < from || t.date > to) continue;
    byDate[t.date] = (byDate[t.date] ?? 0) + t.durationMin;
    plannedMin += t.durationMin;
  }
  return { plannedMin, byDate };
}
