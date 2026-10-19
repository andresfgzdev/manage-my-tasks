import { test } from "node:test";
import assert from "node:assert/strict";
import { fromRange, toCalendarEvents } from "./to-calendar-events.ts";
import type { Task } from "../tasks/domain/task.ts";

function task(over: Partial<Task>): Task {
  return {
    id: "t1",
    title: "Study",
    date: "2026-10-21",
    startMin: 930,
    durationMin: 90,
    priority: 0,
    tags: [],
    done: false,
    steps: [],
    note: "",
    createdAt: "2026-10-17T08:00:00.000Z",
    updatedAt: "2026-10-17T08:00:00.000Z",
    ...over,
  };
}

test("toCalendarEvents skips tasks without a date or a start time", () => {
  const events = toCalendarEvents([
    task({ id: "a", date: null, startMin: null }),
    task({ id: "b", startMin: null }),
    task({ id: "c", date: null, startMin: null, durationMin: 30 }),
    task({ id: "d" }),
  ]);
  assert.deepEqual(events.map((e) => e.id), ["d"]);
});

test("toCalendarEvents ends at start plus duration, at least 15 minutes", () => {
  const [long, none, short] = toCalendarEvents([
    task({ id: "long", startMin: 930, durationMin: 90 }),
    task({ id: "none", startMin: 600, durationMin: 0 }),
    task({ id: "short", startMin: 600, durationMin: 5 }),
  ]);
  assert.equal(long.start, "2026-10-21T15:30");
  assert.equal(long.end, "2026-10-21T17:00");
  assert.equal(none.end, "2026-10-21T10:15");
  assert.equal(short.end, "2026-10-21T10:15");
});

test("toCalendarEvents rolls an end past midnight over to the next day", () => {
  const [event] = toCalendarEvents([task({ startMin: 23 * 60 + 30, durationMin: 60 })]);
  assert.equal(event.end, "2026-10-22T00:30");
});

test("toCalendarEvents picks the tint from the tag", () => {
  const tints = toCalendarEvents([
    task({ id: "s", tags: ["study"] }),
    task({ id: "p", tags: ["personal"] }),
    task({ id: "j", tags: ["project"] }),
    task({ id: "w", tags: ["work"] }),
    task({ id: "n", tags: [] }),
  ]).map((e) => e.extendedProps.tint);
  assert.deepEqual(tints, ["ice", "moss", "bone", "neutral", "neutral"]);
});

test("toCalendarEvents carries the done flag", () => {
  const [open, done] = toCalendarEvents([task({ id: "a" }), task({ id: "b", done: true })]);
  assert.equal(open.extendedProps.done, false);
  assert.equal(done.extendedProps.done, true);
});

test("fromRange keeps the duration of a dragged range", () => {
  assert.deepEqual(fromRange(new Date(2026, 9, 21, 15, 30), new Date(2026, 9, 21, 18, 0)), {
    date: "2026-10-21",
    startMin: 930,
    durationMin: 150,
  });
});

test("fromRange turns a single 15 minute click into a one hour block", () => {
  assert.deepEqual(fromRange(new Date(2026, 9, 21, 9, 0), new Date(2026, 9, 21, 9, 15)), {
    date: "2026-10-21",
    startMin: 540,
    durationMin: 60,
  });
});

test("fromRange rounds to 5 minutes", () => {
  const range = fromRange(new Date(2026, 9, 21, 9, 7), new Date(2026, 9, 21, 9, 52));
  assert.equal(range.startMin, 545);
  assert.equal(range.durationMin, 45);
});

test("fromRange never runs past midnight", () => {
  const range = fromRange(new Date(2026, 9, 21, 23, 30), new Date(2026, 9, 21, 23, 45));
  assert.equal(range.durationMin, 30);
});
