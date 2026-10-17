import { SubTask } from "@/types";
import { repo } from "@/lib/data";
import { respond } from "@/lib/data/respond";

export async function POST(req: Request) {
  const { subtask }: { subtask: SubTask } = await req.json();

  return respond(() =>
    repo.createSubTask({
      title: subtask.title,
      is_completed: subtask.is_completed,
      task_id: subtask.task_id,
    })
  );
}

export async function PUT(req: Request) {
  const { subtask }: { subtask: SubTask } = await req.json();

  return respond(() =>
    repo.updateSubTask({
      id: subtask.id,
      title: subtask.title,
      is_completed: subtask.is_completed,
    })
  );
}

export async function DELETE(req: Request) {
  const { subTaskId }: { subTaskId: string } = await req.json();

  return respond(() => repo.deleteSubTask(subTaskId));
}
