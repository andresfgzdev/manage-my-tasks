import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPatch, validateDraft, validatePatch } from "./task.ts";
import type { Task } from "./task.ts";

const base: Task = {
  id: "t1",
  title: "Write spec",
  date: "2026-10-17",
  startMin: 600,
  durationMin: 30,
  priority: 1,
  tags: ["work"],
  done: false,
  steps: [],
  note: "",
  createdAt: "2026-10-17T08:00:00.000Z",
  updatedAt: "2026-10-17T08:00:00.000Z",
};

test("validateDraft accepts a minimal draft", () => {
  assert.deepEqual(validateDraft({ title: "x" }), { ok: true, value: { title: "x" } });
});

test("validateDraft trims the title and lowercases and dedupes tags", () => {
  const res = validateDraft({ title: "  Hello  ", tags: ["Work", "work", "home"] });
  assert.deepEqual(res, { ok: true, value: { title: "Hello", tags: ["work", "home"] } });
});

test("validateDraft rejects an empty or missing title", () => {
  assert.deepEqual(validateDraft({ title: "   " }), { ok: false, error: "Title is required" });
  assert.deepEqual(validateDraft({}), { ok: false, error: "Title is required" });
});

test("validateDraft rejects a start time without a date", () => {
  assert.equal(validateDraft({ title: "x", startMin: 600 }).ok, false);
  assert.equal(validateDraft({ title: "x", date: null, startMin: 600 }).ok, false);
  assert.equal(validateDraft({ title: "x", date: "2026-10-17", startMin: 600 }).ok, true);
});

test("validateDraft rejects out-of-range and malformed values", () => {
  assert.equal(validateDraft({ title: "x", date: "2026-10-17", startMin: 1440 }).ok, false);
  assert.equal(validateDraft({ title: "x", date: "2026-10-17", startMin: -5 }).ok, false);
  assert.equal(validateDraft({ title: "x", date: "2026-10-17", startMin: 12.5 }).ok, false);
  assert.equal(validateDraft({ title: "x", durationMin: 1441 }).ok, false);
  assert.equal(validateDraft({ title: "x", durationMin: 1.5 }).ok, false);
  assert.equal(validateDraft({ title: "x", priority: 4 }).ok, false);
  assert.equal(validateDraft({ title: "x", date: "2026-02-30" }).ok, false);
  assert.equal(validateDraft({ title: "x", tags: ["#work"] }).ok, false);
  assert.equal(validateDraft({ title: "x", note: "n".repeat(5001) }).ok, false);
  assert.equal(validateDraft({ title: "x".repeat(201) }).ok, false);
});

test("validateDraft accepts any minute of the day as a start time", () => {
  assert.equal(validateDraft({ title: "x", date: "2026-10-17", startMin: 1267 }).ok, true);
  assert.equal(validateDraft({ title: "x", date: "2026-10-17", startMin: 0 }).ok, true);
  assert.equal(validateDraft({ title: "x", date: "2026-10-17", startMin: 1439 }).ok, true);
});

test("validateDraft rejects unknown keys and non-objects", () => {
  assert.deepEqual(validateDraft({ title: "x", done: true }), {
    ok: false,
    error: "Unknown field: done",
  });
  assert.deepEqual(validateDraft({ title: "x", id: "1" }), {
    ok: false,
    error: "Invalid id",
  });
  assert.equal(validateDraft(null).ok, false);
  assert.equal(validateDraft("x").ok, false);
  assert.equal(validateDraft([]).ok, false);
});

test("validatePatch validates steps", () => {
  const ok = validatePatch({ steps: [{ id: "s1", title: "a", done: false }] });
  assert.equal(ok.ok, true);
  assert.equal(validatePatch({ steps: [{ id: "s1", title: "", done: false }] }).ok, false);
  assert.equal(validatePatch({ steps: [{ id: "s1", title: "a" }] }).ok, false);
  assert.equal(validatePatch({ steps: "nope" }).ok, false);
  const many = Array.from({ length: 51 }, (_, i) => ({ id: `s${i}`, title: "a", done: false }));
  assert.equal(validatePatch({ steps: many }).ok, false);
});

test("validatePatch rejects id and timestamps", () => {
  assert.equal(validatePatch({ id: "x" }).ok, false);
  assert.equal(validatePatch({ createdAt: "x" }).ok, false);
});

test("applyPatch updates the fields and updatedAt", () => {
  const now = "2026-10-17T09:30:00.000Z";
  const res = applyPatch(base, { done: true, title: "Write the spec" }, now);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.value.done, true);
    assert.equal(res.value.title, "Write the spec");
    assert.equal(res.value.updatedAt, now);
    assert.equal(res.value.createdAt, base.createdAt);
    assert.equal(res.value.startMin, 600);
  }
  assert.equal(base.done, false, "the original task is not mutated");
});

test("applyPatch rejects a patch that breaks invariants", () => {
  const now = "2026-10-17T09:30:00.000Z";
  assert.equal(applyPatch(base, { date: null }, now).ok, false);
  assert.equal(
    applyPatch({ ...base, date: null, startMin: null }, { startMin: 600 }, now).ok,
    false,
  );
  assert.equal(applyPatch(base, { durationMin: -5 }, now).ok, false);
  assert.equal(applyPatch(base, { date: null, startMin: null }, now).ok, true);
});
