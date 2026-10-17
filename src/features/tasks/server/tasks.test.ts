import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryTaskStore } from "./task-store.ts";
import { createTasksModule, NOT_FOUND } from "./tasks.ts";

function setup() {
  const state = { userId: "alice", seq: 0, clock: Date.parse("2026-10-17T10:00:00.000Z") };
  const store = createMemoryTaskStore();
  const tasks = createTasksModule({
    store,
    userId: async () => state.userId,
    now: () => new Date((state.clock += 1000)),
    newId: () => `id-${++state.seq}`,
  });
  return { state, store, tasks };
}

test("create returns a full task with defaults", async () => {
  const { tasks } = setup();
  const res = await tasks.create({ title: "  Write spec  " });
  assert.deepEqual(res, {
    ok: true,
    value: {
      id: "id-1",
      title: "Write spec",
      date: null,
      startMin: null,
      durationMin: 0,
      priority: 0,
      tag: null,
      done: false,
      steps: [],
      note: "",
      createdAt: "2026-10-17T10:00:01.000Z",
      updatedAt: "2026-10-17T10:00:01.000Z",
    },
  });
});

test("create keeps the fields of a valid draft", async () => {
  const { tasks } = setup();
  const res = await tasks.create({
    title: "Review PR",
    date: "2026-10-17",
    startMin: 930,
    durationMin: 45,
    priority: 2,
    tag: "Work",
  });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.value.startMin, 930);
    assert.equal(res.value.priority, 2);
    assert.equal(res.value.tag, "work");
  }
});

test("create rejects an invalid draft without storing anything", async () => {
  const { tasks } = setup();
  assert.deepEqual(await tasks.create({}), { ok: false, error: "Title is required" });
  assert.equal((await tasks.create({ title: "x", done: true })).ok, false);
  assert.equal((await tasks.create(null)).ok, false);
  assert.deepEqual(await tasks.list(), []);
});

test("update applies a valid patch", async () => {
  const { tasks } = setup();
  const created = await tasks.create({ title: "x" });
  assert.equal(created.ok, true);
  const res = await tasks.update("id-1", { done: true, title: "y" });
  assert.equal(res.ok, true);
  if (res.ok && created.ok) {
    assert.equal(res.value.done, true);
    assert.equal(res.value.title, "y");
    assert.equal(res.value.createdAt, created.value.createdAt);
    assert.notEqual(res.value.updatedAt, created.value.updatedAt);
  }
  assert.equal((await tasks.list())[0].title, "y");
});

test("an invalid patch returns an error and does not modify the task", async () => {
  const { tasks } = setup();
  await tasks.create({ title: "keep me" });
  const res = await tasks.update("id-1", { startMin: 600 });
  assert.equal(res.ok, false);
  assert.equal((await tasks.update("id-1", { title: "" })).ok, false);
  assert.equal((await tasks.update("id-1", { id: "other" })).ok, false);
  const [task] = await tasks.list();
  assert.equal(task.title, "keep me");
  assert.equal(task.startMin, null);
});

test("another user's task is not found", async () => {
  const { state, tasks } = setup();
  await tasks.create({ title: "alice's" });
  state.userId = "bob";
  assert.deepEqual(await tasks.update("id-1", { done: true }), { ok: false, error: NOT_FOUND });
  assert.deepEqual(await tasks.remove("id-1"), { ok: false, error: NOT_FOUND });
  assert.deepEqual(await tasks.list(), []);
  state.userId = "alice";
  assert.equal((await tasks.list())[0].done, false);
});

test("remove deletes the task and then it is not found", async () => {
  const { tasks } = setup();
  await tasks.create({ title: "x" });
  assert.deepEqual(await tasks.remove("id-1"), { ok: true, value: null });
  assert.deepEqual(await tasks.update("id-1", { done: true }), { ok: false, error: NOT_FOUND });
  assert.deepEqual(await tasks.remove("id-1"), { ok: false, error: NOT_FOUND });
  assert.deepEqual(await tasks.list(), []);
});

test("list returns only the user's tasks, oldest first", async () => {
  const { state, tasks } = setup();
  await tasks.create({ title: "first" });
  await tasks.create({ title: "second" });
  state.userId = "bob";
  await tasks.create({ title: "bob's" });
  assert.deepEqual((await tasks.list()).map((t) => t.title), ["bob's"]);
  state.userId = "alice";
  assert.deepEqual((await tasks.list()).map((t) => t.title), ["first", "second"]);
});

test("the store hands out copies, not internal references", async () => {
  const { tasks } = setup();
  await tasks.create({ title: "x" });
  const [first] = await tasks.list();
  first.title = "mutated";
  assert.equal((await tasks.list())[0].title, "x");
});
