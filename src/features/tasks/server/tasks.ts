import { applyPatch, newTask, validateDraft, validatePatch } from "../domain/task.ts";
import type { Result, Task } from "../domain/task.ts";
import type { TaskStore } from "./task-store.ts";

export const NOT_FOUND = "not_found";
export const UNAUTHORIZED = "unauthorized";

const unauthorized = { ok: false, error: UNAUTHORIZED } as const;

export type TasksModule = {
  list(): Promise<Result<Task[]>>;
  create(input: unknown): Promise<Result<Task>>;
  update(id: string, input: unknown): Promise<Result<Task>>;
  remove(id: string): Promise<Result<null>>;
};

export function createTasksModule(deps: {
  store: TaskStore;
  userId: () => Promise<string | null>;
  now: () => Date;
  newId: () => string;
}): TasksModule {
  const { store } = deps;

  return {
    async list() {
      const userId = await deps.userId();
      if (!userId) return unauthorized;
      return { ok: true, value: await store.list(userId) };
    },

    async create(input) {
      const userId = await deps.userId();
      if (!userId) return unauthorized;

      const draft = validateDraft(input);
      if (!draft.ok) return draft;

      // The client names its tasks, so a retried create finds the first one instead of a twin.
      const { id = deps.newId(), ...fields } = draft.value;
      const existing = await store.get(userId, id);
      if (existing) return { ok: true, value: existing };

      const task = newTask(fields, id, deps.now().toISOString());
      await store.put(userId, task);
      return { ok: true, value: task };
    },

    async update(id, input) {
      const userId = await deps.userId();
      if (!userId) return unauthorized;

      const patch = validatePatch(input);
      if (!patch.ok) return patch;

      const current = await store.get(userId, id);
      if (!current) return { ok: false, error: NOT_FOUND };

      const next = applyPatch(current, patch.value, deps.now().toISOString());
      if (!next.ok) return next;

      await store.put(userId, next.value);
      return next;
    },

    async remove(id) {
      const userId = await deps.userId();
      if (!userId) return unauthorized;

      const removed = await store.remove(userId, id);
      return removed ? { ok: true, value: null } : { ok: false, error: NOT_FOUND };
    },
  };
}
