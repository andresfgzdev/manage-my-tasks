"use client";

import { ListTodo, Loader2 } from "lucide-react";

import { Task } from "@/types";
import TaskItem from "./task-item";
import { useCategory } from "@/context/CategoryProvider";
import { useTasks } from "@/hooks/use-tasks";

export default function ListTasks({ userId }: { userId: string }) {
  const { category } = useCategory();

  const { data: tasks, isLoading, isError } = useTasks({ userId, category });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return <div>Error</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <ListTodo className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Tasks Yet</h3>
        <p className="text-muted-foreground">
          You don&apos;t have any tasks yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {tasks.map((task: Task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </>
  );
}
