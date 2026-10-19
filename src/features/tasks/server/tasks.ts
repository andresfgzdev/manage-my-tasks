import { applyPatch, validateDraft, validatePatch } from "../domain/task.ts";
import type { Result, Task } from "../domain/task.ts";
import type { TaskStore } from "./task-store.ts";

export const NOT_FOUND = "not_found";

export type TasksModule = {
  list(): Promise<Task[]>;
  create(input: unknown): Promise<Result<Task>>;
  update(id: string, input: unknown): Promise<Result<Task>>;
  remove(id: string): Promise<Result<null>>;
};

export function createTasksModule(deps: {
  store: TaskStore;
  userId: () => Promise<string>;
  now: () => Date;
  newId: () => string;
}): TasksModule {
  const { store } = deps;

  return {
    async list() {
      return store.list(await deps.userId());
    },

    async create(input) {
      const draft = validateDraft(input);
      if (!draft.ok) return draft;

      const nowIso = deps.now().toISOString();
      const task: Task = {
        date: null,
        startMin: null,
        durationMin: 0,
        priority: 0,
        tags: [],
        note: "",
        ...draft.value,
        id: deps.newId(),
        done: false,
        steps: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await store.put(await deps.userId(), task);
      return { ok: true, value: task };
    },

    async update(id, input) {
      const patch = validatePatch(input);
      if (!patch.ok) return patch;

      const userId = await deps.userId();
      const current = await store.get(userId, id);
      if (!current) return { ok: false, error: NOT_FOUND };

      const next = applyPatch(current, patch.value, deps.now().toISOString());
      if (!next.ok) return next;

      await store.put(userId, next.value);
      return next;
    },

    async remove(id) {
      const removed = await store.remove(await deps.userId(), id);
      return removed ? { ok: true, value: null } : { ok: false, error: NOT_FOUND };
    },
  };
}
