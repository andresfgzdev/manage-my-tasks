"use client";

import { Check, Copy, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useCallback } from "react";
import type { MenuItem } from "@/components/ds/app-menu";
import { useTaskActions } from "@/features/tasks/client/use-tasks";
import type { Task } from "@/features/tasks/domain/task";
import { formatDuration, formatRange } from "@/features/tasks/domain/time";

function summary(task: Task): string {
  return [
    task.startMin !== null ? formatRange(task.startMin, task.durationMin) : null,
    formatDuration(task.durationMin),
    ...task.tags.map((tag) => `#${tag}`),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The actions every task offers, wherever it is shown (row, calendar block). */
export function useTaskMenu() {
  const actions = useTaskActions();

  return useCallback(
    (task: Task, onEdit: () => void): MenuItem[] => [
      { type: "heading", title: task.title, detail: summary(task) || undefined },
      {
        type: "action",
        label: task.done ? "Mark as pending" : "Mark as done",
        icon: task.done ? <RotateCcw /> : <Check />,
        run: () => actions.toggle(task.id),
      },
      { type: "action", label: "Edit details", icon: <Pencil />, run: onEdit },
      { type: "action", label: "Duplicate", icon: <Copy />, run: () => actions.duplicate(task.id) },
      { type: "separator" },
      {
        type: "action",
        label: "Delete",
        icon: <Trash2 />,
        danger: true,
        confirm: true,
        run: () => actions.remove(task.id),
      },
    ],
    [actions],
  );
}
