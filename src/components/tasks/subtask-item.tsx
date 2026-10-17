import { Check, Edit, Trash } from "lucide-react";
import {
  useCreateSubTasks,
  useDeleteSubTask,
  useUpdateSubTask,
} from "@/hooks/use-subtasks";

import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { SubTask } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

interface SubtaskItemProps {
  subtask: SubTask;
  parentCompleted: boolean;
}

export default function SubtaskItem({
  subtask,
  parentCompleted,
}: SubtaskItemProps) {
  const [title, setTitle] = useState(subtask.title);
  const [isEditing, setIsEditing] = useState(subtask?.temp_task || false);
  const updateSubTask = useUpdateSubTask();
  const createSubTask = useCreateSubTasks();
  const deleteSubTask = useDeleteSubTask();

  const handleCreateSubTask = async (subTask: SubTask) => {
    const newSubTask = {
      ...subTask,
      title: title,
      is_completed: false,
      temp_task: false,
    };

    if (newSubTask.title === "") {
      toast.info("Subtask title cannot be empty", {
        duration: 5000,
        closeButton: true,
      });
    }

    setIsEditing(false);

    try {
      await createSubTask.mutateAsync(newSubTask);
    } catch (error) {
      toast.error("Error creating subtask", {
        description:
          error instanceof Error ? error.message : "Failed to create subtask",
        duration: 5000,
        closeButton: true,
      });
    }
  };

  const handleUpdateSubTask = async (
    subtask: SubTask,
    isCompleted: boolean = false
  ) => {
    const updatedSubTask = {
      ...subtask,
      title: title,
      is_completed: isCompleted,
    };

    if (updatedSubTask.title === "") {
      toast.info("Subtask title cannot be empty", {
        duration: 5000,
        closeButton: true,
      });
      return;
    }

    setIsEditing(false);

    try {
      await updateSubTask.mutateAsync(updatedSubTask);
    } catch (error) {
      toast.error("Error updating subtask", {
        description:
          error instanceof Error ? error.message : "Failed to update subtask",
        duration: 5000,
        closeButton: true,
      });
    }
  };

  const handleDeleteSubTask = async (subtask_id: string) => {
    try {
      await deleteSubTask.mutateAsync(subtask_id);
    } catch (error) {
      toast.error("Error deleting subtask", {
        description:
          error instanceof Error ? error.message : "Failed to delete subtask",
        duration: 5000,
        closeButton: true,
      });
    }
  };

  return (
    <div className="w-full flex flex-row items-center justify-between gap-3 text-sm  rounded-sm">
      <div className="w-full flex flex-row items-center gap-3">
        <Checkbox
          className="cursor-pointer size-4"
          checked={subtask.is_completed}
          disabled={parentCompleted}
          onCheckedChange={() =>
            handleUpdateSubTask(subtask, !subtask.is_completed)
          }
        />
        {isEditing ? (
          <Input
            autoFocus
            className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 m-0 h-6 text-sm"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateSubTask(subtask);
              }
            }}
          />
        ) : (
          <label
            className={cn("text-sm", subtask.is_completed && "line-through")}
          >
            {title}
          </label>
        )}
      </div>

      {isEditing ? (
        <Check
          className={cn(
            "cursor-pointer size-5 text hover:text-purple-500 rounded-sm hover:scale-110 transition-all duration-300",
            parentCompleted && "text-gray-400 hover:text-gray-400"
          )}
          onClick={() => {
            if (subtask.temp_task) {
              handleCreateSubTask(subtask);
            } else {
              handleUpdateSubTask(subtask);
            }
          }}
        />
      ) : (
        <div className="flex flex-row items-center gap-3">
          <Edit
            className={cn(
              "cursor-pointer size-4 text hover:text-purple-500 rounded-sm hover:scale-110 transition-all duration-300",
              (subtask.is_completed || parentCompleted) &&
                "text-gray-400 hover:text-gray-400 hover:scale-none cursor-not-allowed"
            )}
            onClick={() => {
              if (!subtask.is_completed && !parentCompleted) {
                setIsEditing(true);
              }
            }}
          />
          <Trash
            className={cn(
              "cursor-pointer size-4 hover:text-red-500 rounded-2xl hover:scale-110 transition-all duration-300",
              (subtask.is_completed || parentCompleted) &&
                "text-gray-400 hover:text-gray-400 hover:scale-none cursor-not-allowed"
            )}
            onClick={() => {
              if (!subtask.is_completed && !parentCompleted) {
                handleDeleteSubTask(subtask.id);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
