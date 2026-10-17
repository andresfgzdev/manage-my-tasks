import { SubTask, Task } from "@/types";
import { TaskRepository } from "./types";

type TaskRow = Omit<Task, "subtasks">;

interface Store {
  tasks: TaskRow[];
  subtasks: SubTask[];
}

// Keep the store on globalThis so it survives dev hot reloads.
// Data is lost when the dev server restarts — nothing is persisted.
const globalForStore = globalThis as unknown as { __memoryStore?: Store };
const store: Store = (globalForStore.__memoryStore ??= {
  tasks: [],
  subtasks: [],
});

const byNewest = (a: { created_at: Date }, b: { created_at: Date }) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const withRelations = (task: TaskRow): Task => ({
  ...task,
  subtasks: store.subtasks.filter((s) => s.task_id === task.id),
});

export const memoryRepository: TaskRepository = {
  async listTasks(userId, category) {
    return store.tasks
      .filter((t) => t.user_id === userId)
      .filter((t) => !category || category === "all" || t.category === category)
      .sort(byNewest)
      .map(withRelations);
  },

  async createTask(task) {
    const now = new Date();
    const row: TaskRow = {
      ...task,
      id: crypto.randomUUID(),
      is_completed: false,
      created_at: now,
      updated_at: now,
    };
    store.tasks.push(row);
    return [withRelations(row)];
  },

  async updateTask(task) {
    const row = store.tasks.find((t) => t.id === task.id);
    if (!row) return [];
    Object.assign(row, task, { updated_at: new Date() });
    return [withRelations(row)];
  },

  async deleteTask(taskId) {
    store.tasks = store.tasks.filter((t) => t.id !== taskId);
    store.subtasks = store.subtasks.filter((s) => s.task_id !== taskId);
  },

  async createSubTask(subtask) {
    const row: SubTask = {
      ...subtask,
      id: crypto.randomUUID(),
      created_at: new Date(),
    };
    store.subtasks.push(row);
    return [row];
  },

  async updateSubTask(subtask) {
    const row = store.subtasks.find((s) => s.id === subtask.id);
    if (!row) return [];
    Object.assign(row, subtask);
    return [row];
  },

  async deleteSubTask(subTaskId) {
    const removed = store.subtasks.filter((s) => s.id === subTaskId);
    store.subtasks = store.subtasks.filter((s) => s.id !== subTaskId);
    return removed;
  },
};
