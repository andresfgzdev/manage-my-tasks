import { SubTask, Task } from "@/types";

export type NewTask = Pick<
  Task,
  "user_id" | "title" | "priority" | "time" | "category"
>;
export type TaskUpdate = Pick<
  Task,
  "id" | "title" | "priority" | "time" | "is_completed" | "category"
>;
export type NewSubTask = Pick<SubTask, "task_id" | "title" | "is_completed">;
export type SubTaskUpdate = Pick<SubTask, "id" | "title" | "is_completed">;

export interface TaskRepository {
  listTasks(userId: string, category?: string | null): Promise<Task[]>;
  createTask(task: NewTask): Promise<Task[]>;
  updateTask(task: TaskUpdate): Promise<Task[]>;
  deleteTask(taskId: string): Promise<void>;

  createSubTask(subtask: NewSubTask): Promise<SubTask[]>;
  updateSubTask(subtask: SubTaskUpdate): Promise<SubTask[]>;
  deleteSubTask(subTaskId: string): Promise<SubTask[]>;
}
