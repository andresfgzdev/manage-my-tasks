import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine, removeTimeMention, setLineWord, splitTimeMentions } from "./parse-line.ts";

const TODAY = "2026-10-17";

const cases: {
  input: string;
  title: string;
  date: string | null | undefined;
  startMin: number | null;
  durationMin: number;
  priority: number;
  tags: string[];
}[] = [
  { input: "Review PR 15:30 ~45m !! #work", title: "Review PR 15:30", date: "2026-10-17", startMin: 930, durationMin: 45, priority: 2, tags: ["work"] },
  { input: "call 3pm", title: "Call 3pm", date: "2026-10-17", startMin: 900, durationMin: 0, priority: 0, tags: [] },
  { input: "run tomorrow 7:05", title: "Run 7:05", date: "2026-10-18", startMin: 425, durationMin: 0, priority: 0, tags: [] },
  { input: "read ~2h", title: "Read", date: undefined, startMin: null, durationMin: 120, priority: 0, tags: [] },
  { input: "25:00 something", title: "25:00 something", date: undefined, startMin: null, durationMin: 0, priority: 0, tags: [] },
  { input: "plan +ana", title: "Plan +ana", date: undefined, startMin: null, durationMin: 0, priority: 0, tags: [] },
  { input: "!!!! urgent", title: "!!!! urgent", date: undefined, startMin: null, durationMin: 0, priority: 0, tags: [] },
  { input: "#Work report", title: "Report", date: undefined, startMin: null, durationMin: 0, priority: 0, tags: ["work"] },
  { input: "today pay rent", title: "Pay rent", date: "2026-10-17", startMin: null, durationMin: 0, priority: 0, tags: [] },
  { input: "12am sleep", title: "12am sleep", date: "2026-10-17", startMin: 0, durationMin: 0, priority: 0, tags: [] },
  { input: "12pm lunch", title: "12pm lunch", date: "2026-10-17", startMin: 720, durationMin: 0, priority: 0, tags: [] },
  { input: "   ", title: "", date: undefined, startMin: null, durationMin: 0, priority: 0, tags: [] },
];

for (const c of cases) {
  test(`parseLine: ${JSON.stringify(c.input)}`, () => {
    const parsed = parseLine(c.input, TODAY);
    assert.equal(parsed.title, c.title);
    assert.equal(parsed.date, c.date);
    assert.equal(parsed.startMin, c.startMin);
    assert.equal(parsed.durationMin, c.durationMin);
    assert.equal(parsed.priority, c.priority);
    assert.deepEqual(parsed.tags, c.tags);
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

test("parseLine keeps a second time in the title and collects every tag", () => {
  const parsed = parseLine("meet 10:00 11:00 #a #b", TODAY);
  assert.equal(parsed.startMin, 600);
  assert.deepEqual(parsed.tags, ["a", "b"]);
  assert.equal(parsed.title, "Meet 10:00 11:00");
});

test("parseLine splits comma separated tags into separate tags", () => {
  const parsed = parseLine("x #test,test2", TODAY);
  assert.deepEqual(parsed.tags, ["test", "test2"]);
  assert.deepEqual(
    parsed.tokens.filter((t) => t.kind === "tag").map((t) => t.label),
    ["#test", "#test2"],
  );
  assert.deepEqual(parseLine("x #a,#b #a", TODAY).tags, ["a", "b"]);
  assert.equal(parseLine("x #a,", TODAY).tags.length, 1);
});

test("parseLine reads a time range and keeps both times in the title", () => {
  for (const input of ["call 13:30 to 15:30", "call 13:30-15:30", "call 1:30pm → 3:30pm"]) {
    const parsed = parseLine(input, TODAY);
    assert.equal(parsed.startMin, 810, input);
    assert.equal(parsed.durationMin, 120, input);
    assert.equal(parsed.title, input.charAt(0).toUpperCase() + input.slice(1));
  }
});

test("parseLine lets an explicit duration win over a range", () => {
  assert.equal(parseLine("x 10:00 to 12:00 ~30m", TODAY).durationMin, 30);
});

test("splitTimeMentions and removeTimeMention work on the title text", () => {
  assert.deepEqual(splitTimeMentions("Call 13:30 to 3pm now"), [
    { text: "Call ", time: false },
    { text: "13:30", time: true },
    { text: " to ", time: false },
    { text: "3pm", time: true },
    { text: " now", time: false },
  ]);
  assert.equal(splitTimeMentions("Room 25:00 v2").some((p) => p.time), false);
  assert.equal(removeTimeMention("Call 13:30 to 3pm now", 0), "Call to 3pm now");
  assert.equal(removeTimeMention("Call 13:30 to 3pm now", 1), "Call 13:30 to now");
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

test("parseLine carries the end's am/pm over to a bare start", () => {
  const lunch = parseLine("Lunch 1:30-3pm", TODAY);
  assert.equal(lunch.startMin, 810);
  assert.equal(lunch.durationMin, 90);
  const late = parseLine("Party 10:00 to 11:00pm", TODAY);
  assert.equal(late.startMin, 1320);
  assert.equal(late.durationMin, 60);
  // The same half of the day would end before it starts: the start is in the other half.
  const meeting = parseLine("Meeting 11-1pm", TODAY);
  assert.equal(meeting.startMin, 660);
  assert.equal(meeting.durationMin, 120);
  // A 24-hour start is left alone.
  assert.equal(parseLine("Call 13:30-3pm", TODAY).startMin, 810);
});

test("parseLine keeps tags whose lowercase has combining marks", () => {
  assert.deepEqual(parseLine("Trip #İstanbul", TODAY).tags, ["i̇stanbul"]);
});

test("setLineWord replaces or removes one kind of word", () => {
  assert.equal(setLineWord("call mum", "time", "15:30"), "call mum 15:30 ");
  assert.equal(setLineWord("call mum 3pm", "time", "16:00"), "call mum 16:00 ");
  assert.equal(setLineWord("meet 13:30 to 15:30 #work", "time", "9:00"), "meet #work 9:00 ");
  assert.equal(setLineWord("meet 13:30-15:30", "time", null), "meet ");
  assert.equal(setLineWord("read ~2h", "duration", "~30m"), "read ~30m ");
  assert.equal(setLineWord("fix bug !! now", "priority", "!!!"), "fix bug now !!! ");
  assert.equal(setLineWord("fix bug !", "priority", null), "fix bug ");
  assert.equal(setLineWord("run today", "day", "tomorrow"), "run tomorrow ");
  assert.equal(setLineWord("today", "day", null), "");
});
