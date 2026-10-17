import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine } from "./parse-line.ts";

const TODAY = "2026-10-17";

const cases: {
  input: string;
  title: string;
  date: string | null | undefined;
  startMin: number | null;
  durationMin: number;
  priority: number;
  tag: string | null;
}[] = [
  { input: "Review PR 15:30 ~45m !! #work", title: "Review PR", date: "2026-10-17", startMin: 930, durationMin: 45, priority: 2, tag: "work" },
  { input: "call 3pm", title: "Call", date: "2026-10-17", startMin: 900, durationMin: 0, priority: 0, tag: null },
  { input: "run tomorrow 7:05", title: "Run", date: "2026-10-18", startMin: 425, durationMin: 0, priority: 0, tag: null },
  { input: "read ~2h", title: "Read", date: undefined, startMin: null, durationMin: 120, priority: 0, tag: null },
  { input: "25:00 something", title: "25:00 something", date: undefined, startMin: null, durationMin: 0, priority: 0, tag: null },
  { input: "plan +ana", title: "Plan +ana", date: undefined, startMin: null, durationMin: 0, priority: 0, tag: null },
  { input: "!!!! urgent", title: "!!!! urgent", date: undefined, startMin: null, durationMin: 0, priority: 0, tag: null },
  { input: "#Work report", title: "Report", date: undefined, startMin: null, durationMin: 0, priority: 0, tag: "work" },
  { input: "today pay rent", title: "Pay rent", date: "2026-10-17", startMin: null, durationMin: 0, priority: 0, tag: null },
  { input: "12am sleep", title: "Sleep", date: "2026-10-17", startMin: 0, durationMin: 0, priority: 0, tag: null },
  { input: "12pm lunch", title: "Lunch", date: "2026-10-17", startMin: 720, durationMin: 0, priority: 0, tag: null },
  { input: "   ", title: "", date: undefined, startMin: null, durationMin: 0, priority: 0, tag: null },
];

for (const c of cases) {
  test(`parseLine: ${JSON.stringify(c.input)}`, () => {
    const parsed = parseLine(c.input, TODAY);
    assert.equal(parsed.title, c.title);
    assert.equal(parsed.date, c.date);
    assert.equal(parsed.startMin, c.startMin);
    assert.equal(parsed.durationMin, c.durationMin);
    assert.equal(parsed.priority, c.priority);
    assert.equal(parsed.tag, c.tag);
  });
}

test("parseLine returns tokens in order of appearance", () => {
  assert.deepEqual(parseLine("Review PR 15:30 ~45m !! #work", TODAY).tokens, [
    { kind: "time", label: "15:30" },
    { kind: "duration", label: "45 min" },
    { kind: "priority", label: "medium" },
    { kind: "tag", label: "#work" },
  ]);
});

test("parseLine labels days, priorities and long durations", () => {
  assert.deepEqual(parseLine("x ! tomorrow ~90m", TODAY).tokens, [
    { kind: "priority", label: "low" },
    { kind: "day", label: "tomorrow" },
    { kind: "duration", label: "1 h 30" },
  ]);
  assert.equal(parseLine("x !!!", TODAY).tokens[0].label, "high");
});

test("parseLine keeps a second token of the same kind in the title", () => {
  const parsed = parseLine("meet 10:00 11:00 #a #b", TODAY);
  assert.equal(parsed.startMin, 600);
  assert.equal(parsed.tag, "a");
  assert.equal(parsed.title, "Meet 11:00 #b");
});

test("parseLine collapses whitespace and rejects invalid durations", () => {
  assert.equal(parseLine("  buy    milk  ", TODAY).title, "Buy milk");
  assert.equal(parseLine("x ~0m", TODAY).durationMin, 0);
  assert.equal(parseLine("x ~25h", TODAY).durationMin, 0);
  assert.equal(parseLine("x 13pm", TODAY).startMin, null);
});

test("parseLine crosses month boundaries for tomorrow", () => {
  assert.equal(parseLine("x tomorrow", "2026-12-31").date, "2027-01-01");
});
