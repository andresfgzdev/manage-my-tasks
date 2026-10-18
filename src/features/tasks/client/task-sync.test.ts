import { test } from "node:test";
import assert from "node:assert/strict";
import { newTask } from "../domain/task.ts";
import type { Task, TaskDraft, TaskPatch } from "../domain/task.ts";
import { createTaskSync, isUnsaved } from "./task-sync.ts";

const NOW = new Date("2026-10-17T10:00:00.000Z");

/** An adapter whose answers the test releases by hand, in any order. */
function fakeServer(initial: Task[] = []) {
  let tasks = [...initial];
  let ids = 0;
  const calls: string[] = [];
  const waiting: { label: string; settle(ok: boolean): void }[] = [];

  const later = <T>(label: string, run: () => T) =>
    new Promise<T>((resolve, reject) => {
      calls.push(label);
      waiting.push({ label, settle: (ok) => (ok ? resolve(run()) : reject(new Error("refused"))) });
    });

  return {
    calls,
    get tasks() {
      return tasks;
    },
    /** Answers the oldest request whose label starts with `prefix`. */
    answer(prefix: string, ok = true) {
      const i = waiting.findIndex((w) => w.label.startsWith(prefix));
      assert.ok(i >= 0, `no pending ${prefix} (pending: ${waiting.map((w) => w.label)})`);
      waiting.splice(i, 1)[0].settle(ok);
    },
    api: {
      list: () => later("list", () => tasks.map((t) => ({ ...t }))),
      create: (draft: TaskDraft) =>
        later(`create ${draft.title}`, () => {
          const task = newTask(draft, `s${++ids}`, NOW.toISOString());
          tasks = [...tasks, task];
          return task;
        }),
      update: (id: string, patch: TaskPatch) =>
        later(`update ${id} ${JSON.stringify(patch)}`, () => {
          const task = { ...tasks.find((t) => t.id === id)!, ...patch };
          tasks = tasks.map((t) => (t.id === id ? task : t));
          return task;
        }),
      remove: (id: string) =>
        later(`remove ${id}`, () => {
          tasks = tasks.filter((t) => t.id !== id);
        }),
    },
  };
}

function setup(initial: Task[] = []) {
  const server = fakeServer(initial);
  let shown: Task[] = [];
  let ids = 0;
  const sync = createTaskSync({
    api: server.api,
    publish: (tasks) => {
      shown = tasks;
    },
    now: () => NOW,
    newId: () => `id${++ids}`,
  });
  return { server, sync, shown: () => shown };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test("create shows the task at once, with the domain defaults, and swaps in the real one", async () => {
  const { server, sync, shown } = setup();
  const { id, saved } = sync.create({ title: "Plan" });
  assert.equal(shown().length, 1);
  assert.ok(isUnsaved(shown()[0]));
  assert.deepEqual({ ...shown()[0], id: "x" }, { ...newTask({ title: "Plan" }, "x", NOW.toISOString()) });
  await tick();
  server.answer("create");
  assert.equal(await saved, true);
  assert.equal(shown()[0].id, "s1");
  assert.notEqual(id, "s1");
});

test("edits made before the create is confirmed are kept and replayed with the real id", async () => {
  const { server, sync, shown } = setup();
  const { id } = sync.create({ title: "Plan" });
  sync.toggle(id);
  sync.update(id, { title: "Plan the week" });
  assert.equal(shown()[0].done, true);
  assert.equal(shown()[0].title, "Plan the week");

  await tick();
  server.answer("create");
  await tick();
  server.answer('update s1 {"done":true}');
  await tick();
  server.answer("update s1");
  await sync.settled();
  assert.deepEqual(server.calls, ["create Plan", 'update s1 {"done":true}', 'update s1 {"title":"Plan the week"}']);
  assert.equal(server.tasks[0].done, true);
  assert.equal(shown()[0].title, "Plan the week");
});

test("writes to one task go out one at a time, so an older answer never shows over a newer edit", async () => {
  const task = newTask({ title: "Run", durationMin: 30 }, "a", NOW.toISOString());
  const { server, sync, shown } = setup([task]);
  sync.seed([task]);
  sync.update("a", { durationMin: 60 });
  sync.update("a", { durationMin: 90 });
  await tick();
  assert.equal(server.calls.length, 1, "the second waits for the first");
  server.answer("update a");
  assert.equal(shown()[0].durationMin, 90, "the pending edit stays on top of the first answer");
  await tick();
  server.answer("update a");
  await sync.settled();
  assert.equal(shown()[0].durationMin, 90);
});

test("a refused create leaves the list and reports it", async () => {
  const { server, sync, shown } = setup();
  const { id, saved } = sync.create({ title: "Too long" });
  sync.update(id, { priority: 2 });
  await tick();
  server.answer("create", false);
  assert.equal(await saved, false);
  assert.equal(shown().length, 0);
  await tick();
  server.answer("list");
  await sync.settled();
  assert.deepEqual(server.calls, ["create Too long", "list"]);
});

test("a list that left before a write was confirmed does not undo that write", async () => {
  const { server, sync, shown } = setup();
  const loading = sync.load();
  const { saved } = sync.create({ title: "New" });
  await tick();
  server.answer("create");
  await saved;
  // The list was read before the create reached the server.
  server.answer("list");
  const list = await loading;
  assert.deepEqual(list.map((t) => t.title), ["New"]);
  assert.deepEqual(shown().map((t) => t.title), ["New"]);
});

test("a refused remove brings the task back", async () => {
  const task = newTask({ title: "Keep" }, "a", NOW.toISOString());
  const { server, sync, shown } = setup([task]);
  sync.seed([task]);
  sync.remove("a");
  assert.equal(shown().length, 0);
  await tick();
  server.answer("remove a", false);
  await tick();
  assert.equal(shown().length, 1);
  server.answer("list");
  await sync.settled();
});

test("an invalid edit is refused locally", () => {
  const task = newTask({ title: "Plan" }, "a", NOW.toISOString());
  const { server, sync, shown } = setup([task]);
  sync.seed([task]);
  sync.update("a", { startMin: 600 }); // a time with no day
  assert.equal(shown()[0].startMin, null);
  assert.deepEqual(server.calls, []);
});

test("duplicate copies the steps under new ids", async () => {
  const task = {
    ...newTask({ title: "Trip", tags: ["home"] }, "a", NOW.toISOString()),
    steps: [{ id: "st", title: "Pack", done: true }],
  };
  const { server, sync, shown } = setup([task]);
  sync.seed([task]);
  sync.duplicate("a");
  const copy = shown()[1];
  assert.equal(copy.title, "Trip");
  assert.equal(copy.steps.length, 1);
  assert.notEqual(copy.steps[0].id, "st");
  await tick();
  server.answer("create");
  await tick();
  server.answer("update");
  await sync.settled();
  assert.equal(server.tasks[1].steps[0].title, "Pack");
});
