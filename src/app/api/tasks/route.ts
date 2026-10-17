import { Priority, Task, newTaskForm } from "@/types";

import { NextResponse } from "next/server";
import { repo } from "@/lib/data";
import { respond } from "@/lib/data/respond";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const userId = searchParams.get("userId");
  const category = searchParams.get("category");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  return respond(async () => {
    const tasks = await repo.listTasks(userId, category);
    return tasks.map((task) => ({
      ...task,
      subtasks: [...task.subtasks].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }));
  });
}

export async function POST(req: Request) {
  const { task, userId }: { task: newTaskForm; userId: string } =
    await req.json();

  return respond(() =>
    repo.createTask({
      user_id: userId,
      title: task.title,
      priority: task.priority as Priority,
      time: task.time,
      category: task.category,
    })
  );
}

export async function PUT(req: Request) {
  const { task }: { task: Task } = await req.json();

  return respond(() =>
    repo.updateTask({
      id: task.id,
      title: task.title,
      priority: task.priority,
      time: task.time,
      is_completed: task.is_completed,
      category: task.category,
    })
  );
}

export async function DELETE(req: Request) {
  const { taskId }: { taskId: string } = await req.json();

  return respond(() => repo.deleteTask(taskId));
}
