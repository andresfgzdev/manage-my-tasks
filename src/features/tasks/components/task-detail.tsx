"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { SegmentMeter } from "@/components/ds/segment-meter";
import { Tick } from "@/components/ds/tick";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/tasks/client/use-now";
import { useTaskActions } from "@/features/tasks/client/use-tasks";
import { addStep, formatTags, setDay, setTime, toggleStep } from "@/features/tasks/domain/edit";
import { PRIORITY_NAMES } from "@/features/tasks/domain/task";
import type { Task, TaskPatch } from "@/features/tasks/domain/task";
import { formatDuration, formatHM, relativeDay, toIsoDate } from "@/features/tasks/domain/time";
import {
  DayEditor,
  DurationEditor,
  PriorityEditor,
  SentenceToken,
  TagEditor,
  TimeEditor,
} from "./sentence-token";

export function TaskDetail({ task, onClose }: { task: Task; onClose(): void }) {
  const actions = useTaskActions();
  const now = useNow();
  const today = now?.today ?? toIsoDate(new Date());

  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note);
  const [newStep, setNewStep] = useState("");

  const doneSteps = task.steps.filter((s) => s.done).length;

  // What the title and note fields would change, so closing sends both in one write.
  const textPatch = (): TaskPatch => {
    const clean = title.trim();
    return {
      ...(clean !== "" && clean !== task.title && { title: clean }),
      ...(note !== task.note && { note }),
    };
  };
  const commit = (patch: TaskPatch) => {
    if (Object.keys(patch).length > 0) actions.update(task.id, patch);
  };
  const commitTitle = () => {
    if (title.trim() === "") setTitle(task.title);
    else commit(textPatch().title ? { title: title.trim() } : {});
  };
  const close = () => {
    commit(textPatch());
    onClose();
  };

  return (
    <article
      aria-label="Task details"
      onKeyDown={(e) => {
        // Radix marks Escape as handled when it closes a popover: don't close the card too.
        if (e.key === "Escape" && !e.defaultPrevented) close();
      }}
      className="relative my-3 ml-[66px] flex animate-row-in flex-col gap-6 rounded-[18px] border border-line bg-surface px-8 py-7 shadow-[0_24px_60px_color-mix(in_srgb,var(--color-shade)_45%,transparent)] max-sm:ml-10 max-sm:px-4 max-sm:py-5"
    >
      <span
        aria-hidden="true"
        className="absolute top-[38px] -left-[5px] size-[9px] rounded-full border-[1.5px] border-sodium bg-ground"
      />

      <div className="flex items-start gap-4">
        <div className="mt-1.5">
          <Tick
            checked={task.done}
            onCheckedChange={() => actions.toggle(task.id)}
            label={task.done ? "Mark as pending" : "Complete"}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <input
            aria-label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="bg-transparent text-[28px] font-semibold tracking-[-0.02em] outline-none"
          />

          <p className="max-w-[860px] text-[19px] leading-[1.9] text-ash">
            Do it{" "}
            <SentenceToken label={relativeDay(task.date, today)}>
              {(closePopover) => (
                <DayEditor
                  date={task.date}
                  today={today}
                  close={closePopover}
                  onChange={(date) => actions.update(task.id, setDay(date))}
                />
              )}
            </SentenceToken>{" "}
            at{" "}
            <SentenceToken label={task.startMin === null ? "add time" : formatHM(task.startMin)}>
              <TimeEditor
                startMin={task.startMin}
                onChange={(startMin) => actions.update(task.id, setTime(task, startMin, today))}
              />
            </SentenceToken>
            , for{" "}
            <SentenceToken label={formatDuration(task.durationMin) || "add duration"}>
              <DurationEditor
                minutes={task.durationMin}
                startMin={task.startMin}
                onChange={(durationMin) => actions.update(task.id, { durationMin })}
              />
            </SentenceToken>
            , with{" "}
            <SentenceToken label={task.priority === 0 ? "no" : PRIORITY_NAMES[task.priority]}>
              {(closePopover) => (
                <PriorityEditor
                  priority={task.priority}
                  close={closePopover}
                  onChange={(priority) => actions.update(task.id, { priority })}
                />
              )}
            </SentenceToken>{" "}
            priority, tagged{" "}
            <SentenceToken label={task.tags.length ? formatTags(task.tags).replaceAll(",", "") : "add tags"}>
              {(closePopover) => (
                <TagEditor
                  tags={task.tags}
                  close={closePopover}
                  onChange={(tags) => actions.update(task.id, { tags })}
                />
              )}
            </SentenceToken>
            .
          </p>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="press grid size-11 shrink-0 place-items-center rounded-control text-ash transition-colors hover:bg-raise hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
        >
          <X className="size-[18px]" />
        </button>
      </div>

      <div className="flex flex-wrap gap-10 pl-10 max-sm:pl-0">
        <section className="flex flex-[1_1_420px] flex-col gap-1">
          <div className="flex items-center justify-between gap-4 pb-2">
            <h3 className="kicker">
              Steps · {doneSteps} of {task.steps.length}
            </h3>
            {task.steps.length > 0 && (
              <div className="w-[120px]">
                <SegmentMeter
                  segments={task.steps.map((s) => s.done)}
                  label={`${doneSteps} of ${task.steps.length} steps done`}
                />
              </div>
            )}
          </div>

          {task.steps.map((step) => (
            <div key={step.id} className="flex min-h-11 items-center gap-3 border-b border-raise">
              <Tick
                className="size-[18px]"
                checked={step.done}
                label={step.done ? "Mark step as pending" : "Complete step"}
                onCheckedChange={() => actions.update(task.id, toggleStep(task, step.id))}
              />
              <span className={cn("text-[15px]", step.done && "text-ash line-through")}>
                {step.title}
              </span>
            </div>
          ))}

          <div className="flex min-h-11 items-center gap-3">
            <span aria-hidden="true" className="w-[18px] text-center font-mono text-sodium">
              ›
            </span>
            <input
              aria-label="New step"
              placeholder="Add a step and press Enter"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                const patch = addStep(task, newStep, crypto.randomUUID());
                if (!patch) return;
                actions.update(task.id, patch);
                setNewStep("");
              }}
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ash-dim"
            />
          </div>
        </section>

        <section className="flex flex-[1_1_320px] flex-col gap-2">
          <h3 className="kicker">Note</h3>
          <textarea
            aria-label="Note"
            rows={3}
            placeholder="Notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => commit(note !== task.note ? { note } : {})}
            className="resize-none rounded-row border border-line bg-ground px-3.5 py-3 text-sm leading-[1.55] outline-none transition-colors placeholder:text-ash-dim focus-visible:border-sodium/40"
          />
        </section>
      </div>
    </article>
  );
}
