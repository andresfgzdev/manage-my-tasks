"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { createContext, useContext, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTaskActions, useTasks } from "@/features/tasks/client/use-tasks";
import type { Priority, Task } from "@/features/tasks/domain/task";
import { formatHM } from "@/features/tasks/domain/time";
import { parseTags } from "./tag-input";

const TaskEditorContext = createContext<{ edit(id: string): void } | null>(null);

export function useTaskEditor() {
  const ctx = useContext(TaskEditorContext);
  if (!ctx) throw new Error("useTaskEditor must be used inside TaskEditorProvider");
  return ctx;
}

/** One dialog for the whole app: any view asks it to edit a task by id. */
export function TaskEditorProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const { tasks } = useTasks();
  const api = useMemo(() => ({ edit: setId }), []);
  const task = id ? tasks.find((t) => t.id === id) : undefined;

  return (
    <TaskEditorContext.Provider value={api}>
      {children}
      <Dialog.Root open={!!task} onOpenChange={(open) => !open && setId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ground/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed top-1/2 left-1/2 z-50 w-[min(520px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-surface p-6 shadow-[0_30px_80px_rgb(0_0_0/0.6)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200"
          >
            {task && <EditForm key={task.id} task={task} onDone={() => setId(null)} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </TaskEditorContext.Provider>
  );
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 0, label: "None" },
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="kicker">{label}</span>
      {children}
    </label>
  );
}

function EditForm({ task, onDone }: { task: Task; onDone(): void }) {
  const actions = useTaskActions();
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date ?? "");
  const [time, setTime] = useState(task.startMin === null ? "" : formatHM(task.startMin));
  const [duration, setDuration] = useState(task.durationMin ? String(task.durationMin) : "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [tags, setTags] = useState(task.tags.map((t) => `#${t}`).join(", "));

  const needsDate = time !== "" && date === "";
  const canSave = title.trim() !== "" && !needsDate;

  const save = () => {
    if (!canSave) return;
    const [h, m] = time.split(":").map(Number);
    const minutes = Math.round(Number(duration));
    actions.update(task.id, {
      title: title.trim(),
      date: date || null,
      startMin: time && date ? h * 60 + m : null,
      durationMin: Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 1440) : 0,
      priority,
      tags: parseTags(tags),
    });
    onDone();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4">
        <Dialog.Title className="text-xl font-semibold tracking-[-0.01em]">Edit task</Dialog.Title>
        <Dialog.Close
          aria-label="Close"
          className="press -mt-1 -mr-1 grid size-9 place-items-center rounded-control text-ash transition-colors hover:bg-raise hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
        >
          <X className="size-4" />
        </Dialog.Close>
      </div>

      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>

      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label="Day">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Starts at">
          <Input type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      {needsDate && (
        <p role="status" className="-mt-2 font-mono text-[11px] text-ash-dim">
          A start time needs a day.
        </p>
      )}

      <Field label="Duration (minutes)">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={0}
            max={1440}
            step={5}
            placeholder="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-28"
          />
          {[15, 30, 45, 60, 120].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setDuration(String(minutes))}
              className={cn(
                "press h-9 rounded-control border px-3 font-mono text-[13px] transition-colors",
                Number(duration) === minutes
                  ? "border-sodium bg-sodium/10 text-sodium-soft"
                  : "border-line text-bone hover:bg-raise",
              )}
            >
              {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Priority">
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={priority === item.value}
              onClick={() => setPriority(item.value)}
              className={cn(
                "press h-9 rounded-control border px-3 text-[13px] transition-colors",
                priority === item.value
                  ? "border-sodium bg-sodium/10 text-sodium-soft"
                  : "border-line text-bone hover:bg-raise",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tags (comma separated)">
        <Input placeholder="#work, home" value={tags} onChange={(e) => setTags(e.target.value)} />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave}>
          Save
        </Button>
      </div>
    </form>
  );
}
