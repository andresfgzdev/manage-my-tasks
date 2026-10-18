import { test } from "node:test";
import assert from "node:assert/strict";
import { newTask } from "../domain/task.ts";
import type { Task } from "../domain/task.ts";
import type { TaskStore } from "./task-store.ts";

type MakeStore = () => Promise<{ store: TaskStore; cleanup(): Promise<void> }>;

const task = (id: string, createdAt: string, title = `Task ${id}`): Task =>
  newTask({ title }, id, createdAt);

/** The behaviour every TaskStore adapter must share; each adapter's test file runs it. */
export function storeContract(makeStore: MakeStore, options: { skip?: string } = {}) {
  const run = (name: string, body: (store: TaskStore) => Promise<void>) =>
    test(name, { skip: options.skip }, async () => {
      const { store, cleanup } = await makeStore();
      try {
        await body(store);
      } finally {
        await cleanup();
      }
    });

  run("list of a user with nothing is empty", async (store) => {
    assert.deepEqual(await store.list("alice"), []);
  });

  run("put then get returns the task; a missing id is null", async (store) => {
    const a = task("a", "2026-10-17T10:00:00.000Z");
    await store.put("alice", a);
    assert.deepEqual(await store.get("alice", "a"), a);
    assert.equal(await store.get("alice", "missing"), null);
  });

  run("put with an existing id replaces the task", async (store) => {
    const a = task("a", "2026-10-17T10:00:00.000Z");
    await store.put("alice", a);
    await store.put("alice", { ...a, title: "Renamed", done: true });
    assert.deepEqual(await store.get("alice", "a"), { ...a, title: "Renamed", done: true });
    assert.equal((await store.list("alice")).length, 1);
  });

  run("list orders by createdAt ascending", async (store) => {
    await store.put("alice", task("b", "2026-10-17T12:00:00.000Z"));
    await store.put("alice", task("a", "2026-10-17T10:00:00.000Z"));
    await store.put("alice", task("c", "2026-10-17T11:00:00.000Z"));
    assert.deepEqual((await store.list("alice")).map((t) => t.id), ["a", "c", "b"]);
  });

  run("users are isolated", async (store) => {
    const a = task("a", "2026-10-17T10:00:00.000Z");
    await store.put("alice", a);
    assert.equal(await store.get("bob", "a"), null);
    assert.deepEqual(await store.list("bob"), []);
    assert.equal(await store.remove("bob", "a"), false);
    assert.deepEqual(await store.get("alice", "a"), a);
  });

  run("remove is true once, then false", async (store) => {
    await store.put("alice", task("a", "2026-10-17T10:00:00.000Z"));
    assert.equal(await store.remove("alice", "a"), true);
    assert.equal(await store.remove("alice", "a"), false);
    assert.equal(await store.get("alice", "a"), null);
  });

  run("returned tasks are copies", async (store) => {
    await store.put("alice", task("a", "2026-10-17T10:00:00.000Z"));
    const got = await store.get("alice", "a");
    assert.ok(got);
    got.title = "Mutated";
    got.tags.push("x");
    const [listed] = await store.list("alice");
    listed.title = "Mutated too";
    assert.equal((await store.get("alice", "a"))?.title, "Task a");
    assert.deepEqual((await store.get("alice", "a"))?.tags, []);
  });

  run("a full task round-trips unchanged", async (store) => {
    const full: Task = {
      ...task("a", "2026-10-17T10:00:00.000Z", "Review PR"),
      date: null,
      startMin: 930,
      durationMin: 45,
      priority: 2,
      tags: ["work", "home"],
      steps: [
        { id: "s1", title: "Read the diff", done: true },
        { id: "s2", title: "Leave comments", done: false },
      ],
      note: "Ask about the migration.",
      updatedAt: "2026-10-17T10:05:00.000Z",
    };
    await store.put("alice", full);
    assert.deepEqual(await store.get("alice", "a"), full);
    assert.deepEqual(await store.list("alice"), [full]);
  });
}
