import { SubTask, Task } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useCategory } from "@/context/CategoryProvider";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const useCreateSubTasks = () => {
  const { id: userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { category } = useCategory();

  return useMutation({
    mutationFn: async (subTaskData: SubTask) => {
      const response = await fetch(`${BASE_URL}/api/subtasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subtask: subTaskData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subtask");
      }

      return response.json();
    },

    onMutate: async (newSubTask) => {
      await queryClient.cancelQueries({
        queryKey: ["tasks", userId, category],
      });

      const previousTasks = queryClient.getQueryData([
        "tasks",
        userId,
        category,
      ]);

      queryClient.setQueryData(
        ["tasks", userId, category],
        (old: Task[] = []) => {
          return old.map((task) =>
            task.id === newSubTask.task_id
              ? {
                  ...task,
                  subtasks: task.subtasks.some(
                    (subtask) => subtask.id === newSubTask.id
                  )
                    ? task.subtasks.map((subtask) =>
                        subtask.id === newSubTask.id
                          ? { ...newSubTask, temp_task: false }
                          : subtask
                      )
                    : [...task.subtasks, { ...newSubTask, temp_task: false }],
                }
              : task
          );
        }
      );

      return { previousTasks };
    },

    onError: (err, newSubTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ["tasks", userId, category],
          context.previousTasks
        );
      }
    },
  });
};

export const useUpdateSubTask = () => {
  const { id: userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { category } = useCategory();
  return useMutation({
    mutationFn: async (subTaskData: SubTask) => {
      const response = await fetch(`${BASE_URL}/api/subtasks`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subtask: subTaskData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update subtask");
      }

      return response.json();
    },
    onMutate: async (subTaskData: SubTask) => {
      await queryClient.cancelQueries({
        queryKey: ["tasks", userId, category],
      });

      const previousTasks = queryClient.getQueryData([
        "tasks",
        userId,
        category,
      ]);

      queryClient.setQueryData(["tasks", userId, "all"], (old: Task[] = []) => {
        return old.map((task) => ({
          ...task,
          subtasks: task.subtasks.map((subtask) =>
            subtask.id === subTaskData.id ? subTaskData : subtask
          ),
        }));
      });

      if (category !== "all") {
        queryClient.setQueryData(
          ["tasks", userId, category],
          (old: Task[] = []) => {
            return old.map((task) => ({
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subTaskData.id ? subTaskData : subtask
              ),
            }));
          }
        );
      }

      return { previousTasks };
    },
    onError: (err, newSubTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ["tasks", userId, category],
          context.previousTasks
        );
      }
    },
  });
};

export const useDeleteSubTask = () => {
  const { id: userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { category } = useCategory();

  return useMutation({
    mutationFn: async (subtask_id: string) => {
      const response = await fetch(`${BASE_URL}/api/subtasks`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subTaskId: subtask_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete subtask");
      }

      return response.json();
    },
    onMutate: async (subtask_id: string) => {
      await queryClient.cancelQueries({
        queryKey: ["tasks", userId, category],
      });

      const previousTasks = queryClient.getQueryData([
        "tasks",
        userId,
        category,
      ]);

      queryClient.setQueryData(["tasks", userId, category], (old: Task[]) => {
        return old.map((task) => ({
          ...task,
          subtasks: task.subtasks.filter(
            (subtask) => subtask.id !== subtask_id
          ),
        }));
      });

      return { previousTasks };
    },
    onError: (err, subtask_id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ["tasks", userId, category],
          context.previousTasks
        );
      }
    },
  });
};
