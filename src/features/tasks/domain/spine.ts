import { addDays, formatHM } from "./time.ts";
import type { Task } from "./task.ts";

export type Lens = "today" | "next" | "inbox";

export type SpineItem =
  | { type: "task"; task: Task; overdue: boolean }
  | { type: "now"; label: string }
  | { type: "heading"; label: string };

/** The lens a task belongs to. Unfinished tasks from earlier days stay on Today, as overdue. */
export function lensOf(task: Pick<Task, "date" | "done">, today: string): Lens | null {
  if (task.date === null) return "inbox";
  if (task.date > today) return "next";
  if (task.date === today || !task.done) return "today";
  return null;
}

function inLens(task: Task, lens: Lens, today: string): boolean {
  return lensOf(task, today) === lens;
}

/** True once a timed block has ended before `nowMin`. */
export function isLate(startMin: number, durationMin: number, nowMin: number): boolean {
  return startMin + Math.max(durationMin, 0) < nowMin;
}

function isOverdue(task: Task, today: string, nowMin: number): boolean {
  if (task.done || task.date === null || task.date > today) return false;
  if (task.date < today) return true;
  return task.startMin !== null && isLate(task.startMin, task.durationMin, nowMin);
}

function byCreated(a: Task, b: Task): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

function byWhen(a: Task, b: Task): number {
  const dateA = a.date ?? "";
  const dateB = b.date ?? "";
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return (a.startMin ?? 0) - (b.startMin ?? 0) || byCreated(a, b);
}

export function buildSpine(tasks: Task[], lens: Lens, today: string, nowMin: number): SpineItem[] {
  const scoped = tasks.filter((t) => inLens(t, lens, today));
  const timed = scoped.filter((t) => t.startMin !== null).sort(byWhen);
  const untimed = scoped.filter((t) => t.startMin === null).sort(byCreated);

  const toItem = (task: Task): SpineItem => ({
    type: "task",
    task,
    overdue: lens === "today" && isOverdue(task, today, nowMin),
  });

  const items: SpineItem[] = [];
  let nowPlaced = lens !== "today";
  const nowItem: SpineItem = { type: "now", label: formatHM(nowMin) };

  // Tasks carried over from earlier days sort first (by date) and are always before now.
  for (const task of timed) {
    if (!nowPlaced && task.date === today && (task.startMin as number) > nowMin) {
      items.push(nowItem);
      nowPlaced = true;
    }
    items.push(toItem(task));
  }
  if (!nowPlaced) items.push(nowItem);

  if (untimed.length > 0) {
    items.push({ type: "heading", label: lens === "inbox" ? "No date" : "Whenever" });
    for (const task of untimed) items.push(toItem(task));
  }
  return items;
}

export function lensCounts(tasks: Task[], today: string): Record<Lens, number> {
  const counts = { today: 0, next: 0, inbox: 0 };
  for (const task of tasks) {
    const lens = lensOf(task, today);
    if (lens) counts[lens] += 1;
  }
  return counts;
}

export function daySummary(
  tasks: Task[],
  today: string,
): { done: number; total: number; focusLeftMin: number; segments: boolean[] } {
  const day = tasks.filter((t) => t.date === today);
  const ordered = [...day].sort((a, b) => {
    if ((a.startMin === null) !== (b.startMin === null)) return a.startMin === null ? 1 : -1;
    return (a.startMin ?? 0) - (b.startMin ?? 0) || byCreated(a, b);
  });
  return {
    done: day.filter((t) => t.done).length,
    total: day.length,
    focusLeftMin: day.filter((t) => !t.done).reduce((sum, t) => sum + t.durationMin, 0),
    segments: ordered.map((t) => t.done),
  };
}

export function defaultDateFor(lens: Lens, today: string): string | null {
  if (lens === "today") return today;
  if (lens === "next") return addDays(today, 1);
  return null;
}

/** Blocks and planned minutes that fall inside each hour of today, for [fromH, toH). */
export function hourPlan(
  tasks: Task[],
  today: string,
  fromH: number,
  toH: number,
): { blocks: number; minutes: number }[] {
  const timed = tasks.filter((t) => t.date === today && t.startMin !== null);
  const plan: { blocks: number; minutes: number }[] = [];
  for (let h = fromH; h < toH; h++) {
    const from = h * 60;
    const to = from + 60;
    let blocks = 0;
    let minutes = 0;
    for (const t of timed) {
      const start = t.startMin as number;
      const end = start + Math.max(t.durationMin, 15);
      const overlap = Math.min(end, to) - Math.max(start, from);
      if (overlap > 0) {
        blocks += 1;
        minutes += overlap;
      }
    }
    plan.push({ blocks, minutes });
  }
  return plan;
}
