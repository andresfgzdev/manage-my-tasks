import { Task, newTaskForm } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useCategory } from "@/context/CategoryProvider";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const useTasks = ({
  userId,
  category,
}: {
  userId: string;
  category: string;
}) => {
  return useQuery({
    queryKey: ["tasks", userId, category],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId,
        category,
      });
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return res.json();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60,
  });
};

export const useCreateTask = () => {
  const { id: userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { category } = useCategory();

  return useMutation({
    mutationFn: async (newTaskData: newTaskForm) => {
      const response = await fetch(`${BASE_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: newTaskData,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create tasks");
      }

      return response.json();
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", userId] });

      const tempId = crypto.randomUUID();
      const optimisticTask = {
        id: tempId,
        ...newTask,
        is_completed: false,
        subtasks: [],
      };

      queryClient.setQueryData(["tasks", userId, "all"], (old: Task[] = []) => [
        optimisticTask,
        ...old,
      ]);

      if (newTask.category !== "all") {
        queryClient.setQueryData(
          ["tasks", userId, newTask.category],
          (old: Task[] = []) => [optimisticTask, ...old]
        );
      }

      return { optimisticTask };
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(["tasks", userId, "all"], (old: Task[]) =>
        old.filter((task) => task.id !== context?.optimisticTask.id)
      );

      if (newTask.category !== "all") {
        queryClient.setQueryData(
          ["tasks", userId, newTask.category],
          (old: Task[]) =>
            old.filter((task) => task.id !== context?.optimisticTask.id)
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId, category] });
    },
  });
};

export const useUpdateTask = () => {
  const { id: userId } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: Task) => {
      const response = await fetch(`${BASE_URL}/api/tasks`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: taskData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      return response.json();
    },
    onMutate: async (taskData: Task) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", userId] });

      const previousTasks = queryClient.getQueryData<Task[]>(["tasks", userId]);

      queryClient.setQueryData(["tasks", userId, "all"], (old: Task[] = []) =>
        old.map((task) => (task.id === taskData.id ? taskData : task))
      );

      if (taskData.category && taskData.category !== "all") {
        queryClient.setQueryData(
          ["tasks", userId, taskData.category],
          (old: Task[] = []) =>
            old.map((task) => (task.id === taskData.id ? taskData : task))
        );
      }

      return { previousTasks };
    },
    onError: (err, taskData, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ["tasks", userId, "all"],
          context.previousTasks
        );

        if (taskData.category && taskData.category !== "all") {
          queryClient.setQueryData(
            ["tasks", userId, taskData.category],
            context.previousTasks
          );
        }
      }
    },
  });
};

export const useDeleteTask = () => {
  const { id: userId } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Task) => {
      const response = await fetch(`${BASE_URL}/api/tasks`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      return response.json();
    },
    onMutate: async (task: Task) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", userId] });

      const previousTasks = queryClient.getQueryData<Task[]>(["tasks", userId]);

      queryClient.setQueryData(["tasks", userId, "all"], (old: Task[] = []) =>
        old.filter((currentTask) => currentTask.id !== task.id)
      );

      if (task.category !== "all") {
        queryClient.setQueryData(
          ["tasks", userId, task.category],
          (old: Task[] = []) =>
            old.filter((currentTask) => currentTask.id !== task.id)
        );
      }

      return { previousTasks };
    },
    onError: (err, task_id, context) => {
      queryClient.setQueryData(["tasks", userId], context?.previousTasks);
    },
  });
};
