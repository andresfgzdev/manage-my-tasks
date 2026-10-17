import {
  Briefcase,
  Check,
  ChevronsUpDown,
  Clock,
  Edit,
  MoreVertical,
  Plus,
  Trash,
  User,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn, formatTimeForDisplay } from "@/lib/utils";
import { useDeleteTask, useUpdateTask } from "@/hooks/use-tasks";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import SubtaskItem from "./subtask-item";
import { Task } from "@/types";
import { priorityColors } from "@/lib/constants";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCategory } from "@/context/CategoryProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function TaskItem({ task }: { task: Task }) {
  const [isEditing, setIsEditing] = useState(false);
  const [taskTitle, setTaskTitle] = useState(task.title);
  const { category } = useCategory();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const { id: userId } = useCurrentUser();

  const handleCheckboxChange = async (task: Task) => {
    const newData = {
      ...task,
      is_completed: !task.is_completed,
    };

    setIsEditing(false);

    try {
      await updateTask.mutateAsync(newData);
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to update",
        duration: 5000,
        closeButton: true,
      });
    }
  };
  const handleUpdateTask = async (task: Task) => {
    const updatedTask = {
      ...task,
      title: taskTitle,
    };
    setIsEditing(false);

    try {
      await updateTask.mutateAsync(updatedTask);
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to update",
        duration: 5000,
        closeButton: true,
      });
    }
  };
  const handleAddNewSubTask = (taskId: string) => {
    const newSubTask = {
      id: crypto.randomUUID(),
      title: "",
      is_completed: false,
      task_id: taskId,
      temp_task: true,
      created_at: new Date(),
    };

    const previousTasks = queryClient.getQueryData<Task[]>([
      "tasks",
      userId,
      category,
    ]);

    let hasOpenSubtask: boolean = false;
    previousTasks?.map((task) => {
      task?.subtasks?.map((subtask) => {
        if (subtask.temp_task) {
          hasOpenSubtask = true;
        }
      });
    });

    if (hasOpenSubtask) {
      toast.info("You have an open subtask, please complete it first.", {
        duration: 5000,
        closeButton: true,
      });
      return;
    }

    queryClient.setQueryData(
      ["tasks", userId, category],
      (old: Task[] = []) => {
        return old.map((task) =>
          task.id === taskId
            ? { ...task, subtasks: [newSubTask, ...task.subtasks] }
            : task
        );
      }
    );
  };
  const handleDeleteTask = async (task: Task) => {
    setIsEditing(false);
    try {
      await deleteTask.mutateAsync(task);
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete",
        duration: 5000,
        closeButton: true,
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card
      className={cn(
        "py-2 text-md font-nunito hover:border-purple-400 transition-all duration-200 ease-in-out hover:scale-[1.02] delay-75 relative",
        task.is_completed &&
          "bg-accent/20 hover:border-accent/20  opacity-60 hover:opacity-70 hover:scale-100"
      )}
    >
      <CardContent>
        <Collapsible disabled={isEditing}>
          <div className="flex flex-row justify-between items-center">
            <div className="w-full flex flex-row items-center gap-3">
              <div className="flex flex-row items-center gap-2">
                <Checkbox
                  checked={task.is_completed}
                  className="cursor-pointer size-4.5"
                  onCheckedChange={() => handleCheckboxChange(task)}
                  disabled={isEditing}
                />
                <div className="flex items-center gap-1.5">
                  {task.category === "work" ? (
                    <Briefcase color="#48fffd" className="size-5" />
                  ) : task.category === "personal" ? (
                    <User color="#10b981" className="size-5" />
                  ) : (
                    ""
                  )}
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full sm:hidden",
                      getPriorityColor(task.priority)
                    )}
                  />
                </div>
              </div>
              <div className="w-full flex flex-col gap-0">
                <div className="flex flex-row items-center justify-between">
                  {isEditing ? (
                    <Input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full mr-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateTask(task);
                        }
                      }}
                    />
                  ) : (
                    <label
                      className={cn(
                        "truncate max-w-[150px] sm:max-w-none",
                        task.is_completed && "line-through"
                      )}
                    >
                      {taskTitle}
                    </label>
                  )}

                  <div className="flex flex-row items-center gap-1 sm:gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        priorityColors[task.priority],
                        "ml-auto text-xs sm:text-sm hidden sm:inline-flex"
                      )}
                    >
                      {task.priority}
                    </Badge>
                    {task.time != null && task.time !== "00:00:00" ? (
                      <div className="hidden sm:flex items-center font-medium bg-primary/5 text-primary rounded-md px-2 py-0 w-fit min-w-[100px]">
                        <Clock className="mr-1.5 h-3.5 w-3.5 text-purple-300" />
                        <span className="text-[13px] text-purple-400">
                          {formatTimeForDisplay(task.time)}
                        </span>
                      </div>
                    ) : (
                      ""
                    )}

                    {isEditing ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateTask(task)}
                        disabled={task.is_completed}
                      >
                        <Check className="h-2" />
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          disabled={task.is_completed}
                        >
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setIsEditing(true)}
                          >
                            <Edit className="h-2" />
                            <span>Update</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500"
                            onClick={() => handleDeleteTask(task)}
                          >
                            <Trash className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <CollapsibleTrigger asChild className="cursor-pointer">
              <Button variant="ghost" size="sm">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <Separator className="my-2" />
            <div className="flex flex-row justify-between">
              <h4 className="text-sm text-gray-400 pb-2">Subtasks</h4>
              <Plus
                size={18}
                className="cursor-pointer hover:text-purple-500 rounded-sm transition-all duration-200 hover:scale-110"
                onClick={() => {
                  if (task.is_completed) {
                    toast.info(
                      "You cannot add a subtask to a completed task.",
                      {
                        duration: 5000,
                        closeButton: true,
                      }
                    );
                    return;
                  }
                  handleAddNewSubTask(task.id);
                }}
              />
            </div>

            <div className="pl-4 pb-2 flex flex-col gap-1.5">
              {task.subtasks?.length > 0 ? (
                task.subtasks.map((subtask) => (
                  <SubtaskItem
                    key={subtask.id}
                    subtask={subtask}
                    parentCompleted={task.is_completed}
                  />
                ))
              ) : (
                <div className="text-sm text-gray-400">No subtasks yet.</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
