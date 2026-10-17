import { addDays, formatHM } from "./time.ts";
import type { Task } from "./task.ts";

export type Lens = "today" | "next" | "inbox";

export type SpineItem =
  | { type: "task"; task: Task; overdue: boolean }
  | { type: "now"; label: string }
  | { type: "heading"; label: string };

function inLens(task: Task, lens: Lens, today: string): boolean {
  if (lens === "today") return task.date === today;
  if (lens === "next") return task.date !== null && task.date > today;
  return task.date === null;
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
    overdue:
      lens === "today" &&
      !task.done &&
      task.startMin !== null &&
      task.startMin + Math.max(task.durationMin, 0) < nowMin,
  });

  const items: SpineItem[] = [];
  let nowPlaced = lens !== "today";
  const nowItem: SpineItem = { type: "now", label: formatHM(nowMin) };

  for (const task of timed) {
    if (!nowPlaced && (task.startMin as number) > nowMin) {
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
  const lenses: Lens[] = ["today", "next", "inbox"];
  const counts = { today: 0, next: 0, inbox: 0 };
  for (const lens of lenses) {
    counts[lens] = tasks.filter((t) => inLens(t, lens, today)).length;
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

/** Number of today's timed tasks overlapping each hour in [fromH, toH). */
export function hourLoad(tasks: Task[], today: string, fromH: number, toH: number): number[] {
  const timed = tasks.filter((t) => t.date === today && t.startMin !== null);
  const loads: number[] = [];
  for (let h = fromH; h < toH; h++) {
    loads.push(
      timed.filter((t) => {
        const start = t.startMin as number;
        const end = start + Math.max(t.durationMin, 15);
        return start < (h + 1) * 60 && end > h * 60;
      }).length,
    );
  }
  return loads;
}

export function defaultDateFor(lens: Lens, today: string): string | null {
  if (lens === "today") return today;
  if (lens === "next") return addDays(today, 1);
  return null;
}
