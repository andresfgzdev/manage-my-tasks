import { getDb } from "@/lib/mongo";
import { getCurrentUserId } from "@/lib/session";
import { createMongoTaskStore, ensureTaskIndexes } from "./mongo-task-store.ts";
import type { TaskDoc } from "./mongo-task-store.ts";
import type { TaskStore } from "./task-store.ts";
import { createTasksModule } from "./tasks.ts";

const collection = getDb().collection<TaskDoc>("tasks");
const mongo = createMongoTaskStore(collection);

// The indexes are created once per process, in the background of the first list.
// A failure is logged and retried on the next list; it never fails a request.
let indexes: Promise<void> | null = null;
function ensureIndexes() {
  indexes ??= ensureTaskIndexes(collection).catch((error) => {
    indexes = null;
    console.error("Could not create the task indexes", error);
  });
}

const store: TaskStore = {
  ...mongo,
  list(userId) {
    ensureIndexes();
    return mongo.list(userId);
  },
};

export const tasks = createTasksModule({
  store,
  userId: getCurrentUserId,
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
});
