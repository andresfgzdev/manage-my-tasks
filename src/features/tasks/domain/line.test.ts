import { test } from "node:test";
import assert from "node:assert/strict";
import { describeDraft, placeLine } from "./line.ts";

const TODAY = "2026-10-17";
const TOMORROW = "2026-10-18";

test("without a day, a line goes to the view it was typed in", () => {
  assert.equal(placeLine("Pay rent", TODAY, { view: "today" }).draft?.date, TODAY);
  assert.equal(placeLine("Pay rent", TODAY, { view: "next" }).draft?.date, TOMORROW);
  const inbox = placeLine("Pay rent", TODAY, { view: "inbox" });
  assert.equal(inbox.draft?.date, null);
  assert.equal(inbox.lands, "inbox");
});

test("a typed day or time wins over the view", () => {
  const p = placeLine("Pay rent tomorrow", TODAY, { view: "inbox" });
  assert.equal(p.draft?.date, TOMORROW);
  assert.equal(p.lands, "next");
  assert.equal(placeLine("Call 15:30", TODAY, { view: "inbox" }).lands, "today");
});

test("on Week the block wins over typed times, and a time is required", () => {
  const block = { date: "2026-10-21", startMin: 600, durationMin: 90 };
  const p = placeLine("Write 15:30 ~20m", TODAY, { view: "week", block });
  assert.deepEqual(
    { date: p.draft?.date, startMin: p.draft?.startMin, durationMin: p.draft?.durationMin },
    { date: "2026-10-21", startMin: 600, durationMin: 90 },
  );
  const missing = placeLine("Write", TODAY, { view: "week", block: null });
  assert.equal(missing.draft, null);
  assert.equal(missing.needsTime, true);
  assert.equal(placeLine("Write 9am", TODAY, { view: "week", block: null }).draft?.date, TODAY);
});

test("an empty line makes nothing and needs nothing", () => {
  const p = placeLine("  ", TODAY, { view: "week", block: null });
  assert.equal(p.draft, null);
  assert.equal(p.needsTime, false);
});

test("describeDraft reads the draft back as a sentence", () => {
  const p = placeLine("Call 11:00 to 12:30 #work,home tomorrow", TODAY, { view: "today" });
  assert.equal(describeDraft(p.draft!, TODAY), "tomorrow from 11:00 to 12:30, tagged work and home");
  assert.equal(
    describeDraft({ title: "x", date: null, durationMin: 45, priority: 3 }, TODAY),
    "with no day, for 45 min, high priority",
  );
  assert.equal(describeDraft({ title: "x", date: "2026-10-20", startMin: 540 }, TODAY), "on Oct 20 at 09:00");
});
