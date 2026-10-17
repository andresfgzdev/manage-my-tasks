import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSpine, daySummary, defaultDateFor, hourLoad, lensCounts } from "./spine.ts";
import type { SpineItem } from "./spine.ts";
import type { Task } from "./task.ts";

const TODAY = "2026-10-17";
const TOMORROW = "2026-10-18";

let seq = 0;
function task(over: Partial<Task>): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Task ${seq}`,
    date: TODAY,
    startMin: null,
    durationMin: 0,
    priority: 0,
    tag: null,
    done: false,
    steps: [],
    note: "",
    createdAt: `2026-10-17T08:00:${String(seq).padStart(2, "0")}.000Z`,
    updatedAt: "2026-10-17T08:00:00.000Z",
    ...over,
  };
}

function shape(items: SpineItem[]): string[] {
  return items.map((i) => (i.type === "task" ? i.task.id : i.type === "now" ? `now:${i.label}` : `heading:${i.label}`));
}

test("today orders by time and puts now before the first future task", () => {
  const a = task({ id: "a", startMin: 900 });
  const b = task({ id: "b", startMin: 480 });
  const c = task({ id: "c", startMin: 600 });
  const items = buildSpine([a, b, c], "today", TODAY, 540);
  assert.deepEqual(shape(items), ["b", "now:09:00", "c", "a"]);
});

test("today puts now first when every task is still ahead", () => {
  const a = task({ id: "a", startMin: 900 });
  assert.deepEqual(shape(buildSpine([a], "today", TODAY, 60)), ["now:01:00", "a"]);
});

test("today puts now after the timed tasks when all have passed", () => {
  const a = task({ id: "a", startMin: 480 });
  const b = task({ id: "b", startMin: 540 });
  assert.deepEqual(shape(buildSpine([a, b], "today", TODAY, 1200)), ["a", "b", "now:20:00"]);
});

test("today shows only the marker when there are no tasks", () => {
  assert.deepEqual(shape(buildSpine([], "today", TODAY, 750)), ["now:12:30"]);
});

test("untimed tasks go under the Whenever heading, oldest first", () => {
  const timed = task({ id: "t", startMin: 480 });
  const u1 = task({ id: "u1" });
  const u2 = task({ id: "u2" });
  const items = buildSpine([u2, timed, u1], "today", TODAY, 600);
  assert.deepEqual(shape(items), ["t", "now:10:00", "heading:Whenever", "u1", "u2"]);
});

test("today ignores other days and the inbox", () => {
  const other = task({ id: "o", date: TOMORROW, startMin: 600 });
  const inbox = task({ id: "i", date: null });
  assert.deepEqual(shape(buildSpine([other, inbox], "today", TODAY, 0)), ["now:00:00"]);
});

test("next shows only future dates ordered by date and time, with no marker", () => {
  const a = task({ id: "a", date: "2026-10-19", startMin: 480 });
  const b = task({ id: "b", date: TOMORROW, startMin: 900 });
  const c = task({ id: "c", date: TOMORROW, startMin: 540 });
  const past = task({ id: "p", date: "2026-10-16", startMin: 540 });
  const now = task({ id: "n", date: TODAY, startMin: 540 });
  assert.deepEqual(shape(buildSpine([a, b, c, past, now], "next", TODAY, 600)), ["c", "b", "a"]);
});

test("inbox shows only tasks without a date, with no marker", () => {
  const a = task({ id: "a", date: null });
  const b = task({ id: "b", date: TODAY });
  assert.deepEqual(shape(buildSpine([a, b], "inbox", TODAY, 600)), ["heading:No date", "a"]);
});

test("overdue applies only to unfinished timed tasks in today", () => {
  const late = task({ id: "late", startMin: 480, durationMin: 30 });
  const running = task({ id: "run", startMin: 480, durationMin: 120 });
  const done = task({ id: "done", startMin: 480, durationMin: 30, done: true });
  const items = buildSpine([late, running, done], "today", TODAY, 600);
  const overdue = Object.fromEntries(
    items.flatMap((i) => (i.type === "task" ? [[i.task.id, i.overdue]] : [])),
  );
  assert.deepEqual(overdue, { late: true, run: false, done: false });

  const nextTask = task({ id: "n", date: TOMORROW, startMin: 0, durationMin: 0 });
  const nextItems = buildSpine([nextTask], "next", TODAY, 600);
  assert.equal(nextItems[0].type === "task" && nextItems[0].overdue, false);
});

test("lensCounts counts every task in each lens", () => {
  const tasks = [
    task({ date: TODAY }),
    task({ date: TODAY, done: true }),
    task({ date: TOMORROW }),
    task({ date: "2026-11-01" }),
    task({ date: null }),
    task({ date: "2026-10-01" }),
  ];
  assert.deepEqual(lensCounts(tasks, TODAY), { today: 2, next: 2, inbox: 1 });
});

test("daySummary reports done, total, remaining focus and ordered segments", () => {
  const tasks = [
    task({ startMin: 900, durationMin: 45, done: false }),
    task({ startMin: 480, durationMin: 20, done: true }),
    task({ startMin: null, durationMin: 30, done: false }),
    task({ date: TOMORROW, durationMin: 600 }),
  ];
  assert.deepEqual(daySummary(tasks, TODAY), {
    done: 1,
    total: 3,
    focusLeftMin: 75,
    segments: [true, false, false],
  });
  assert.deepEqual(daySummary([], TODAY), { done: 0, total: 0, focusLeftMin: 0, segments: [] });
});

test("hourLoad counts tasks overlapping each hour", () => {
  const tasks = [
    task({ startMin: 7 * 60 + 30, durationMin: 60 }),
    task({ startMin: 8 * 60, durationMin: 0 }),
    task({ startMin: null }),
    task({ date: TOMORROW, startMin: 7 * 60, durationMin: 60 }),
  ];
  assert.deepEqual(hourLoad(tasks, TODAY, 7, 10), [1, 2, 0]);
  assert.equal(hourLoad(tasks, TODAY, 7, 23).length, 16);
});

test("defaultDateFor", () => {
  assert.equal(defaultDateFor("today", TODAY), TODAY);
  assert.equal(defaultDateFor("next", TODAY), TOMORROW);
  assert.equal(defaultDateFor("inbox", TODAY), null);
});
