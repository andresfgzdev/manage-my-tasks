import type { Task, TaskDraft, TaskPatch } from "@/features/tasks/domain/task";

// Private to the client module: nothing outside client/ talks to /api/tasks.

const STORAGE_PREFIX = "better-tasks:tasks:";

/** Where use-tasks.tsx keeps a user's last confirmed tasks: one copy per account. */
export const storageKey = (userId: string) => `${STORAGE_PREFIX}v3:${userId}`;

/** Forgets every account's copy (older formats too), so a shared browser keeps none. */
export function clearTasksCache() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Privacy mode: there is no copy to forget.
  }
}

/** The session is gone: forget the copies and log in again, then come back here. */
export function endSession() {
  clearTasksCache();
  const next = encodeURIComponent(location.pathname + location.search);
  // A full load on purpose: no in-memory cache of this account survives.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?reason=expired&next=${next}`);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) endSession();
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
