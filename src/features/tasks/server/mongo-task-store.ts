import type { Collection, Db, WithId } from "mongodb";
import { MAX_DURATION, MAX_TAGS } from "../domain/task.ts";
import type { Task } from "../domain/task.ts";
import type { TaskStore } from "./task-store.ts";

// One document per task: the id is the _id, the owner is a field (D13).
export type TaskDoc = Omit<Task, "id"> & { _id: string; userId: string };

function toTask(doc: WithId<TaskDoc>): Task {
  return {
    id: doc._id,
    title: doc.title,
    date: doc.date,
    startMin: doc.startMin,
    durationMin: doc.durationMin,
    priority: doc.priority,
    tags: doc.tags,
    done: doc.done,
    steps: doc.steps,
    note: doc.note,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** MongoDB adapter. It receives the collection: the environment stays in default-tasks.ts. */
export function createMongoTaskStore(collection: Collection<TaskDoc>): TaskStore {
  return {
    async list(userId) {
      const docs = await collection.find({ userId }).sort({ createdAt: 1, _id: 1 }).toArray();
      return docs.map(toTask);
    },
    async get(userId, id) {
      const doc = await collection.findOne({ _id: id, userId });
      return doc ? toTask(doc) : null;
    },
    async put(userId, task) {
      const { id, ...rest } = task;
      await collection.replaceOne({ _id: id, userId }, { ...rest, userId }, { upsert: true });
    },
    async remove(userId, id) {
      const { deletedCount } = await collection.deleteOne({ _id: id, userId });
      return deletedCount === 1;
    },
  };
}

export async function ensureTaskIndexes(collection: Collection<TaskDoc>): Promise<void> {
  await collection.createIndex({ userId: 1, createdAt: 1 });
}

const nullable = (bsonType: string) => ({ bsonType: [bsonType, "null"] });

/**
 * The shape of a stored task: a type guard against writes that bypass the domain.
 * The domain stays the source of truth for the rules (title length, tag format…).
 */
export const taskValidator = {
  $jsonSchema: {
    bsonType: "object",
    additionalProperties: false,
    required: ["_id", "userId", "title", "date", "startMin", "durationMin", "priority", "tags", "done", "steps", "note", "createdAt", "updatedAt"],
    properties: {
      _id: { bsonType: "string" },
      userId: { bsonType: "string" },
      title: { bsonType: "string" },
      date: { ...nullable("string"), pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      startMin: { ...nullable("number"), minimum: 0, maximum: 1439 },
      durationMin: { bsonType: "number", minimum: 0, maximum: MAX_DURATION },
      priority: { enum: [0, 1, 2, 3] },
      tags: { bsonType: "array", maxItems: MAX_TAGS, items: { bsonType: "string" } },
      done: { bsonType: "bool" },
      steps: {
        bsonType: "array",
        items: {
          bsonType: "object",
          additionalProperties: false,
          required: ["id", "title", "done"],
          properties: { id: { bsonType: "string" }, title: { bsonType: "string" }, done: { bsonType: "bool" } },
        },
      },
      note: { bsonType: "string" },
      createdAt: { bsonType: "string" },
      updatedAt: { bsonType: "string" },
    },
  },
};

/** Creates the collection with the validator, or applies it to an existing one, plus the indexes. Idempotent. */
export async function setUpTasksCollection(db: Db, name = "tasks"): Promise<Collection<TaskDoc>> {
  const exists = (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0;
  if (exists) {
    await db.command({ collMod: name, validator: taskValidator, validationLevel: "strict", validationAction: "error" });
  } else {
    await db.createCollection(name, { validator: taskValidator, validationLevel: "strict", validationAction: "error" });
  }
  const collection = db.collection<TaskDoc>(name);
  await ensureTaskIndexes(collection);
  return collection;
}
