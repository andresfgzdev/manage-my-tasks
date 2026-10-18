import { after, test } from "node:test";
import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { newTask } from "../domain/task.ts";
import { createMongoTaskStore, setUpTasksCollection } from "./mongo-task-store.ts";
import { storeContract } from "./task-store-contract.ts";

// Runs only against a real database: set MONGODB_URI_TEST to enable it.
const uri = process.env.MONGODB_URI_TEST;
const client = uri ? new MongoClient(uri) : null;
const skip = client ? undefined : "MONGODB_URI_TEST is not set";

after(() => client?.close());

// Every contract case runs with the validator on, so it must accept any valid task.
storeContract(
  async () => {
    const collection = await setUpTasksCollection(client!.db(), `tasks_test_${crypto.randomUUID()}`);
    return { store: createMongoTaskStore(collection), cleanup: async () => void (await collection.drop()) };
  },
  { skip },
);

test("the validator rejects a malformed task", { skip }, async () => {
  const collection = await setUpTasksCollection(client!.db(), `tasks_test_${crypto.randomUUID()}`);
  try {
    // Untyped on purpose: these writes bypass TaskDoc, as a bad write would.
    const raw = client!.db().collection<{ _id: string }>(collection.collectionName);
    const { id, ...task } = newTask({ title: "Valid" }, "a", "2026-10-17T10:00:00.000Z");
    const doc = { ...task, _id: id, userId: "alice" };
    await raw.insertOne(doc);

    const bad = [
      { priority: 7 },
      { startMin: 1440 },
      { date: "17/10/2026" },
      { tags: "work" },
      { steps: [{ id: "s1", title: "x" }] },
      { extra: true },
    ];
    for (const change of bad) {
      await assert.rejects(raw.insertOne({ ...doc, ...change, _id: crypto.randomUUID() }), /validation/i, JSON.stringify(change));
    }
    const untitled: { _id: string; title?: string } = { ...doc, _id: crypto.randomUUID() };
    delete untitled.title;
    await assert.rejects(raw.insertOne(untitled), /validation/i);
  } finally {
    await collection.drop();
  }
});
