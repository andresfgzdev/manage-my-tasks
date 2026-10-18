import { getCurrentUserId } from "@/lib/session";
import { createMemoryTaskStore } from "./task-store.ts";
import type { MemoryBacking } from "./task-store.ts";
import { createTasksModule } from "./tasks.ts";

// Keep the data on globalThis so it survives dev hot reloads.
// It is lost when the server restarts: nothing is persisted yet.
const globalForTasks = globalThis as unknown as { __tasksStore?: MemoryBacking };
const backing = (globalForTasks.__tasksStore ??= new Map());

export const tasks = createTasksModule({
  store: createMemoryTaskStore(backing),
  userId: getCurrentUserId,
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
});
