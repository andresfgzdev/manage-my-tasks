"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createContext, useContext, useEffect, useState } from "react";
import type { Task } from "@/features/tasks/domain/task";
import { tasksApi } from "./tasks-api";
import { createTaskSync } from "./task-sync";
import type { TaskSync } from "./task-sync";

export { isUnsaved } from "./task-sync";

const KEY = ["tasks"] as const;
const NO_TASKS: Task[] = [];
const STORAGE_KEY = "better-tasks:tasks:v2";

export type TaskActions = Pick<TaskSync, "create" | "update" | "toggle" | "duplicate" | "remove">;

const TasksContext = createContext<TaskSync | null>(null);

function readStorage(): Task[] | null {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    // Older cached tasks have no `tags`: drop them rather than render a broken row.
    return Array.isArray(cached) && cached.every((t) => Array.isArray(t?.tags)) ? cached : null;
  } catch {
    return null;
  }
}

function setUp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false },
    },
  });
  const sync = createTaskSync({
    api: tasksApi,
    publish: (tasks) => queryClient.setQueryData<Task[]>(KEY, tasks),
  });
  if (typeof window !== "undefined") {
    // The last known tasks paint at once, and the request starts now rather than
    // after the first render's effects.
    const cached = readStorage();
    if (cached) sync.seed(cached);
    queryClient.fetchQuery({ queryKey: KEY, queryFn: sync.load, staleTime: 0 }).catch(() => {});
  }
  return { queryClient, sync };
}

/** Owns the tasks cache: React Query, the optimistic sync and the copy in localStorage. */
export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [{ queryClient, sync }] = useState(setUp);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.query.queryKey[0] !== KEY[0]) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const confirmed = sync.confirmed();
          if (confirmed) localStorage.setItem(STORAGE_KEY, JSON.stringify(confirmed));
        } catch {
          // Quota or privacy mode: the copy is optional.
        }
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient, sync]);

  return (
    <QueryClientProvider client={queryClient}>
      <TasksContext.Provider value={sync}>{children}</TasksContext.Provider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

function useSync(): TaskSync {
  const sync = useContext(TasksContext);
  if (!sync) throw new Error("Tasks hooks must be used inside TasksProvider");
  return sync;
}

export function useTasks(): { tasks: Task[]; isLoading: boolean; isError: boolean } {
  const sync = useSync();
  const { data, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: sync.load });
  return { tasks: data ?? NO_TASKS, isLoading, isError };
}

/** Stable for the life of the app: memoised rows can depend on it. */
export function useTaskActions(): TaskActions {
  return useSync();
}
