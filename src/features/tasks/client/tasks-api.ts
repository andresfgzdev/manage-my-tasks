import type { Task, TaskDraft, TaskPatch } from "@/features/tasks/domain/task";

// Private to the client module: nothing outside client/ talks to /api/tasks.

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Request failed");
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const tasksApi = {
  list: () => request<Task[]>("/api/tasks"),
  create: (draft: TaskDraft) =>
    request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(draft) }),
  update: (id: string, patch: TaskPatch) =>
    request<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),
};
