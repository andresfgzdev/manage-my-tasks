import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dayTitle,
  formatDuration,
  formatHM,
  shiftOf,
  toIsoDate,
  weekRange,
} from "./time.ts";

test("formatDuration", () => {
  assert.equal(formatDuration(0), "");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(60), "1 h");
  assert.equal(formatDuration(90), "1 h 30");
  assert.equal(formatDuration(150), "2 h 30");
});

test("formatHM pads hours and minutes", () => {
  assert.equal(formatHM(0), "00:00");
  assert.equal(formatHM(65), "01:05");
  assert.equal(formatHM(930), "15:30");
});

test("addDays handles month and year ends", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-10-17", 0), "2026-10-17");
});

test("toIsoDate uses local date parts", () => {
  assert.equal(toIsoDate(new Date(2026, 9, 7)), "2026-10-07");
});

test("dayTitle uses English names", () => {
  assert.deepEqual(dayTitle(new Date(2026, 9, 17)), { name: "Saturday", num: "Oct 17" });
  assert.deepEqual(dayTitle(new Date(2026, 0, 2)), { name: "Friday", num: "Jan 2" });
});

test("shiftOf", () => {
  assert.equal(shiftOf(0), "morning");
  assert.equal(shiftOf(11), "morning");
  assert.equal(shiftOf(12), "afternoon");
  assert.equal(shiftOf(18), "afternoon");
  assert.equal(shiftOf(19), "evening");
  assert.equal(shiftOf(23), "evening");
});

test("weekRange is Monday to Sunday", () => {
  assert.deepEqual(weekRange("2026-10-17"), { from: "2026-10-12", to: "2026-10-18" });
  assert.deepEqual(weekRange("2026-10-12"), { from: "2026-10-12", to: "2026-10-18" });
  assert.deepEqual(weekRange("2026-10-18"), { from: "2026-10-12", to: "2026-10-18" });
});
