"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Task, TaskDraft, TaskPatch } from "@/features/tasks/domain/task";
import { tasksApi } from "./tasks-api";

const KEY = ["tasks"] as const;
const NO_TASKS: Task[] = [];
const TEMP_PREFIX = "tmp-";

export const TASKS_KEY = KEY;

export function useTasks(): { tasks: Task[]; isLoading: boolean; isError: boolean } {
  const { data, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: tasksApi.list });
  return { tasks: data ?? NO_TASKS, isLoading, isError };
}

export function useTaskActions(): {
  create(draft: TaskDraft): void;
  update(id: string, patch: TaskPatch): void;
  toggle(id: string): void;
  duplicate(id: string): void;
  remove(id: string): void;
} {
  const queryClient = useQueryClient();

  const setTasks = (change: (tasks: Task[]) => Task[]) =>
    queryClient.setQueryData<Task[]>(KEY, (old) => change(old ?? NO_TASKS));
  const find = (id: string) => queryClient.getQueryData<Task[]>(KEY)?.find((t) => t.id === id);
  const replace = (id: string, task: Task) =>
    setTasks((all) => all.map((t) => (t.id === id ? task : t)));
  const resync = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createMutation = useMutation({
    mutationFn: ({ draft }: { draft: TaskDraft; tempId: string }) => tasksApi.create(draft),
    onMutate: async ({ draft, tempId }) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const now = new Date().toISOString();
      setTasks((all) => [
        ...all,
        {
          date: null,
          startMin: null,
          durationMin: 0,
          priority: 0,
          tags: [],
          note: "",
          ...draft,
          id: tempId,
          done: false,
          steps: [],
          createdAt: now,
          updatedAt: now,
        },
      ]);
    },
    onSuccess: (task, { tempId }) => replace(tempId, task),
    // A failed write rolls back and resyncs: the UI itself is the feedback.
    onError: (_error, { tempId }) => {
      setTasks((all) => all.filter((t) => t.id !== tempId));
      resync();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch }) => tasksApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = find(id);
      if (previous) replace(id, { ...previous, ...patch });
      return { previous };
    },
    onSuccess: (task) => replace(task.id, task),
    onError: (_error, { id }, context) => {
      if (context?.previous) replace(id, context.previous);
      resync();
    },
  });

  // Actions on a task that is still being created (temporary id) are ignored:
  // the window is a few milliseconds and the server does not know that id yet.
  const isTemporary = (id: string) => id.startsWith(TEMP_PREFIX);

  const { mutate: create } = createMutation;
  const { mutate: save } = updateMutation;

  // Stable identity: memoised rows depend on it.
  return useMemo(() => {
    const update = (id: string, patch: TaskPatch) => {
      if (!isTemporary(id)) save({ id, patch });
    };
    return {
      create: (draft: TaskDraft) =>
        create({ draft, tempId: `${TEMP_PREFIX}${crypto.randomUUID()}` }),

      update,

      toggle: (id: string) => {
        const task = find(id);
        if (task && !isTemporary(id)) update(id, { done: !task.done });
      },

      duplicate: (id: string) => {
        const task = find(id);
        if (!task || isTemporary(id)) return;
        const { title, date, startMin, durationMin, priority, tags, note } = task;
        create({
          draft: { title, date, startMin, durationMin, priority, tags: [...tags], note },
          tempId: `${TEMP_PREFIX}${crypto.randomUUID()}`,
        });
      },

      // Optimistic: the task leaves the cache now. If the server refuses, it
      // comes back on the resync.
      remove: (id: string) => {
        if (isTemporary(id) || !find(id)) return;
        setTasks((all) => all.filter((t) => t.id !== id));
        tasksApi.remove(id).catch(resync);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, create, save]);
}
