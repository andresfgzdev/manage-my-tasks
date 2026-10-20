"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { TASKS_KEY } from "@/features/tasks/client/use-tasks";
import type { Task } from "@/features/tasks/domain/task";
import { TooltipProvider } from "@/components/ui/tooltip";

const CACHE_KEY = "better-tasks:tasks:v2";

// The last known tasks are painted from localStorage while the network
// request revalidates them (`updatedAt: 0` keeps them stale).
function useTasksCache(queryClient: QueryClient) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw && queryClient.getQueryData(TASKS_KEY) === undefined) {
        const cached = JSON.parse(raw) as Task[];
        // Older cached tasks have no `tags`: drop them rather than render a broken row.
        if (Array.isArray(cached) && cached.every((t) => Array.isArray(t.tags))) {
          queryClient.setQueryData<Task[]>(TASKS_KEY, cached, { updatedAt: 0 });
        }
      }
    } catch {
      // Storage unavailable or corrupted: start empty.
    }

    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.query.queryKey[0] !== TASKS_KEY[0]) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const data = queryClient.getQueryData<Task[]>(TASKS_KEY);
          if (data && !data.some((t) => t.id.startsWith("tmp-"))) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          }
        } catch {
          // Quota or privacy mode: the cache is optional.
        }
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false },
        },
      }),
  );
  useTasksCache(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={250} skipDelayDuration={100}>
        {children}
      </TooltipProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
