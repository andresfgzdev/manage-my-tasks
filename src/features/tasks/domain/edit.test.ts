import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addStep,
  clampDuration,
  editAll,
  formatTags,
  readTags,
  readTimeText,
  setDay,
  setTime,
  toggleStep,
} from "./edit.ts";

const TODAY = "2026-10-17";

test("removing the day removes the time; setting a day keeps it", () => {
  assert.deepEqual(setDay(null), { date: null, startMin: null });
  assert.deepEqual(setDay("2026-10-20"), { date: "2026-10-20" });
});

test("a time on an undated task puts it on today", () => {
  assert.deepEqual(setTime({ date: null }, 600, TODAY), { startMin: 600, date: TODAY });
  assert.deepEqual(setTime({ date: "2026-10-20" }, 600, TODAY), { startMin: 600 });
  assert.deepEqual(setTime({ date: null }, null, TODAY), { startMin: null });
});

test("readTimeText, clampDuration", () => {
  assert.equal(readTimeText("15:30"), 930);
  assert.equal(readTimeText(" 3pm "), 900);
  assert.equal(readTimeText(""), null);
  assert.equal(clampDuration(-5), 0);
  assert.equal(clampDuration(44.6), 45);
  assert.equal(clampDuration(5000), 1440);
  assert.equal(clampDuration(Number.NaN), 0);
});

test("readTags and formatTags round-trip", () => {
  assert.deepEqual(readTags("#Work, home #work bad!tag"), ["work", "home"]);
  assert.equal(readTags(Array.from({ length: 12 }, (_, i) => `t${i}`).join(" ")).length, 8);
  assert.deepEqual(readTags(formatTags(["work", "home"])), ["work", "home"]);
});

test("steps", () => {
  const task = { steps: [{ id: "a", title: "One", done: false }] };
  assert.deepEqual(toggleStep(task, "a"), { steps: [{ id: "a", title: "One", done: true }] });
  assert.equal(addStep(task, "   ", "b"), null);
  assert.deepEqual(addStep(task, " Two ", "b")?.steps?.at(-1), { id: "b", title: "Two", done: false });
});

test("editAll applies the same day and time rules as the single edits", () => {
  const base = { title: " Plan ", date: "", time: "09:30", duration: "45", priority: 2 as const, tags: "#work" };
  const timed = editAll(base, TODAY);
  assert.deepEqual(timed, {
    ok: true,
    value: { title: "Plan", date: TODAY, startMin: 570, durationMin: 45, priority: 2, tags: ["work"] },
  });
  const cleared = editAll({ ...base, time: "" }, TODAY);
  assert.equal(cleared.ok && cleared.value.date, null);
  assert.equal(cleared.ok && cleared.value.startMin, null);
  assert.equal(editAll({ ...base, title: "  " }, TODAY).ok, false);
});
