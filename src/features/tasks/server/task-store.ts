import type { Task } from "../domain/task.ts";

// The only seam in the server module: a real database adapter plugs in here.
export interface TaskStore {
  list(userId: string): Promise<Task[]>;
  get(userId: string, id: string): Promise<Task | null>;
  put(userId: string, task: Task): Promise<void>;
  remove(userId: string, id: string): Promise<boolean>;
}

export type MemoryBacking = Map<string, Map<string, Task>>;

/** In-memory adapter for tests: each store is isolated unless given a shared `backing` map. */
export function createMemoryTaskStore(backing: MemoryBacking = new Map()): TaskStore {
  const forUser = (userId: string) => {
    let tasks = backing.get(userId);
    if (!tasks) {
      tasks = new Map();
      backing.set(userId, tasks);
    }
    return tasks;
  };

  return {
    async list(userId) {
      return [...forUser(userId).values()]
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
        .map((task) => structuredClone(task));
    },
    async get(userId, id) {
      const task = forUser(userId).get(id);
      return task ? structuredClone(task) : null;
    },
    async put(userId, task) {
      forUser(userId).set(task.id, structuredClone(task));
    },
    async remove(userId, id) {
      return forUser(userId).delete(id);
    },
  };
}
