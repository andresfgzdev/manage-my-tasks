import type { Task } from "../tasks/domain/task.ts";
import { addDays, formatHM } from "../tasks/domain/time.ts";

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

/** Turns a calendar selection (or a moved/resized event) into task time fields. */
export function fromRange(
  start: Date,
  end: Date,
): { date: string; startMin: number; durationMin: number } {
  const startMin = roundTo(start.getHours() * 60 + start.getMinutes(), SNAP_MIN);
  const length = Math.round((end.getTime() - start.getTime()) / 60000);
  // A single click selects one 15 minute slot: give it a useful default length.
  const wanted = length === 15 ? DEFAULT_BLOCK_MIN : roundTo(length, SNAP_MIN);
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return {
    date,
    startMin: Math.min(startMin, 1439),
    durationMin: Math.max(SNAP_MIN, Math.min(wanted, 1440 - startMin)),
  };
}
