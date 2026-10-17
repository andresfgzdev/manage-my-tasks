"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Task, TaskDraft, TaskPatch } from "@/features/tasks/domain/task";
import { tasksApi } from "./tasks-api";

const KEY = ["tasks"] as const;
const NO_TASKS: Task[] = [];
const UNDO_MS = 4000;
const TEMP_PREFIX = "tmp-";

const byCreated = (a: Task, b: Task) => (a.createdAt < b.createdAt ? -1 : 1);

export function useTasks(): { tasks: Task[]; isLoading: boolean; isError: boolean } {
  const { data, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: tasksApi.list });
  return { tasks: data ?? NO_TASKS, isLoading, isError };
}

export function useTaskActions(): {
  create(draft: TaskDraft): void;
  update(id: string, patch: TaskPatch): void;
  toggle(id: string): void;
  remove(id: string): void;
} {
  const queryClient = useQueryClient();

  const setTasks = (change: (tasks: Task[]) => Task[]) =>
    queryClient.setQueryData<Task[]>(KEY, (old) => change(old ?? NO_TASKS));
  const find = (id: string) => queryClient.getQueryData<Task[]>(KEY)?.find((t) => t.id === id);
  const replace = (id: string, task: Task) =>
    setTasks((all) => all.map((t) => (t.id === id ? task : t)));
  const resync = () => queryClient.invalidateQueries({ queryKey: KEY });
  const reportFailure = (message: string, error: unknown) =>
    toast.error(message, { description: error instanceof Error ? error.message : undefined });

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
          tag: null,
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
    onError: (error, { tempId }) => {
      setTasks((all) => all.filter((t) => t.id !== tempId));
      reportFailure("Couldn't create the task", error);
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
    onError: (error, { id }, context) => {
      if (context?.previous) replace(id, context.previous);
      reportFailure("Couldn't save the change", error);
      resync();
    },
  });

  // Actions on a task that is still being created (temporary id) are ignored:
  // the window is a few milliseconds and the server does not know that id yet.
  const isTemporary = (id: string) => id.startsWith(TEMP_PREFIX);

  const update = (id: string, patch: TaskPatch) => {
    if (!isTemporary(id)) updateMutation.mutate({ id, patch });
  };

  return {
    create: (draft) =>
      createMutation.mutate({ draft, tempId: `${TEMP_PREFIX}${crypto.randomUUID()}` }),

    update,

    toggle: (id) => {
      const task = find(id);
      if (!task || isTemporary(id)) return;
      const done = !task.done;
      update(id, { done });
      if (done) {
        toast("Done", {
          description: task.title,
          duration: UNDO_MS,
          action: { label: "Undo", onClick: () => update(id, { done: false }) },
        });
      }
    },

    // Optimistic: the task leaves the cache now and the DELETE only reaches the
    // server after UNDO_MS, unless the user undoes it. The timer is not tied to
    // the component, so it survives the row unmounting.
    remove: (id) => {
      const task = find(id);
      if (!task || isTemporary(id)) return;
      setTasks((all) => all.filter((t) => t.id !== id));
      const restore = () =>
        setTasks((all) => (all.some((t) => t.id === id) ? all : [...all, task].sort(byCreated)));

      const timer = setTimeout(async () => {
        try {
          await tasksApi.remove(id);
        } catch (error) {
          restore();
          reportFailure("Couldn't delete the task", error);
          resync();
        }
      }, UNDO_MS);

      toast("Deleted", {
        description: task.title,
        duration: UNDO_MS,
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer);
            restore();
          },
        },
      });
    },
  };
}
