import { readTime } from "./parse-line.ts";
import { MAX_DURATION, MAX_TAGS, PRIORITY_NAMES, normalizeTag } from "./task.ts";
import type { Priority, Result, Task, TaskPatch } from "./task.ts";

// The edits every editing surface offers (inline sentence, edit dialog, Week).
// Each returns a patch that already respects the task rules, so no caller has to know them.

/** Changing the day. Removing it removes the time too: a time needs a day. */
export function setDay(date: string | null): TaskPatch {
  return date === null ? { date, startMin: null } : { date };
}

/** Setting a time. An undated task with a time goes on today. */
export function setTime(task: Pick<Task, "date">, startMin: number | null, today: string): TaskPatch {
  return startMin !== null && task.date === null ? { startMin, date: today } : { startMin };
}

/** Minutes for "15:30" (what a time input gives) or "3pm"; null for empty or invalid text. */
export function readTimeText(text: string): number | null {
  return readTime(text.trim());
}

/** Any number to a valid duration: whole minutes in 0..1440. */
export function clampDuration(minutes: number): number {
  return Number.isFinite(minutes) ? Math.min(Math.max(Math.round(minutes), 0), MAX_DURATION) : 0;
}

/** "#work, home #urgent" → ["work", "home", "urgent"]; invalid pieces are dropped. */
export function readTags(text: string): string[] {
  const tags: string[] = [];
  for (const piece of text.split(/[\s,]+/)) {
    const tag = normalizeTag(piece);
    if (tag !== null && !tags.includes(tag) && tags.length < MAX_TAGS) tags.push(tag);
  }
  return tags;
}

/** The text an editor shows for a task's tags; `readTags` reads it back. */
export function formatTags(tags: string[]): string {
  return tags.map((tag) => `#${tag}`).join(", ");
}

export function toggleStep(task: Pick<Task, "steps">, stepId: string): TaskPatch {
  return { steps: task.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) };
}

/** Appends a step; null when the title is blank. */
export function addStep(task: Pick<Task, "steps">, title: string, id: string): TaskPatch | null {
  const clean = title.trim();
  return clean === "" ? null : { steps: [...task.steps, { id, title: clean, done: false }] };
}

export const PRIORITY_CHOICES: { value: Priority; label: string }[] = PRIORITY_NAMES.map(
  (name, value) => ({ value: value as Priority, label: name.charAt(0).toUpperCase() + name.slice(1) }),
);

export const DURATION_SHORTCUTS: { minutes: number; label: string }[] = [15, 30, 45, 60, 120].map(
  (minutes) => ({ minutes, label: minutes < 60 ? `${minutes}m` : `${minutes / 60}h` }),
);

/** Every field of the edit dialog at once, under the same rules as the single edits. */
export function editAll(
  fields: { title: string; date: string; time: string; duration: string; priority: Priority; tags: string },
  today: string,
): Result<TaskPatch> {
  const title = fields.title.trim();
  if (title === "") return { ok: false, error: "Title is required" };
  const date = fields.date === "" ? null : fields.date;
  return {
    ok: true,
    value: {
      title,
      ...setDay(date),
      ...setTime({ date }, readTimeText(fields.time), today),
      durationMin: clampDuration(Number(fields.duration)),
      priority: fields.priority,
      tags: readTags(fields.tags),
    },
  };
}
