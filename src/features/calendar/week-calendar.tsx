"use client";

import FullCalendar, { useCalendarController } from "@fullcalendar/react";
import type {
  CalendarRef,
  DateSelectInfo,
  EventClickInfo,
  EventDropInfo,
  EventResizeDoneInfo,
} from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import "@fullcalendar/react/skeleton.css";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useAppMenu } from "@/components/ds/app-menu";
import type { MenuItem } from "@/components/ds/app-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTaskActions, useTasks } from "@/features/tasks/client/use-tasks";
import { useQuickAdd } from "@/features/tasks/components/quick-add";
import { useTaskEditor } from "@/features/tasks/components/task-editor";
import { useTaskMenu } from "@/features/tasks/components/task-menu";
import { dayTitle, formatDuration, isoWeek, toIsoDate, weekRange } from "@/features/tasks/domain/time";
import { fromRange, toCalendarEvents } from "./to-calendar-events";
import type { Tint } from "./to-calendar-events";

const TINT_CLASSES: Record<Tint, string> = {
  ice: "border-ice/30 bg-ice/[0.13]",
  moss: "border-moss/30 bg-moss/[0.13]",
  bone: "border-bone/20 bg-bone/[0.08]",
  neutral: "border-line bg-raise",
};

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function rangeTitle(from: string, to: string): string {
  const start = dayTitle(parseIso(from)).num;
  const end = dayTitle(parseIso(to));
  return start.split(" ")[0] === end.num.split(" ")[0]
    ? `${start}–${end.num.split(" ")[1]}`
    : `${start} – ${end.num}`;
}

export function WeekCalendar() {
  const calendar = useRef<CalendarRef>(null);
  const controller = useCalendarController();
  const { tasks } = useTasks();
  const actions = useTaskActions();
  const { pending, setPendingRange, focus } = useQuickAdd();
  const menu = useAppMenu();
  const taskMenu = useTaskMenu();
  const editor = useTaskEditor();

  const events = useMemo(() => toCalendarEvents(tasks), [tasks]);

  // The Line cleared the block (Enter, Esc or the ✕ chip): drop the calendar selection too.
  useEffect(() => {
    if (!pending) calendar.current?.getApi().unselect();
  }, [pending]);
  useEffect(() => () => setPendingRange(null), [setPendingRange]);

  const range = weekRange(toIsoDate(controller.getDate() ?? new Date()));
  const planned = tasks
    .filter((t) => t.date !== null && t.date >= range.from && t.date <= range.to)
    .reduce((sum, t) => sum + t.durationMin, 0);

  const loadByDate = new Map<string, number>();
  for (const t of tasks) {
    if (t.date) loadByDate.set(t.date, (loadByDate.get(t.date) ?? 0) + t.durationMin);
  }

  const select = (info: DateSelectInfo) => {
    setPendingRange(fromRange(info.start, info.end));
    focus();
  };

  const move = (info: EventDropInfo | EventResizeDoneInfo) => {
    const { event } = info;
    if (!event.start) return;
    actions.update(event.id, fromRange(event.start, event.end ?? new Date(event.start.getTime() + 900000)));
  };

  // Right click: on a block it offers that task's actions, elsewhere the week's.
  const openContextMenu = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-event-id]");
    const task = el ? tasks.find((t) => t.id === el.dataset.eventId) : undefined;
    const items: MenuItem[] = task
      ? taskMenu(task, () => editor.edit(task.id))
      : [
          { type: "action", label: "New task", icon: <Plus />, run: focus },
          { type: "separator" },
          { type: "action", label: "Today", icon: <CalendarDays />, run: () => controller.today() },
          { type: "action", label: "Previous week", icon: <ChevronLeft />, run: () => controller.prev() },
          { type: "action", label: "Next week", icon: <ChevronRight />, run: () => controller.next() },
        ];
    e.preventDefault();
    e.stopPropagation();
    menu.open({ kind: "point", x: e.clientX, y: e.clientY }, items);
  };

  return (
    <div className="min-w-0 flex-1 pb-[280px]" onContextMenu={openContextMenu}>
      <header className="flex flex-wrap items-end justify-between gap-5 pb-5">
        <div className="flex flex-col gap-1.5">
          <span className="kicker">Better Tasks · week {isoWeek(range.from)}</span>
          <h1 className="text-[44px] leading-none font-semibold tracking-[-0.03em] max-sm:text-[32px]">
            {rangeTitle(range.from, range.to)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-2.5 font-mono text-xs text-ash">
            {formatDuration(planned) || "0 min"} planned
          </span>
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => controller.prev()}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => controller.today()}>
            Today
          </Button>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => controller.next()}>
            <ChevronRight />
          </Button>
        </div>
      </header>

      <FullCalendar
        ref={calendar}
        controller={controller}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        locale="en"
        firstDay={1}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:30:00"
        snapDuration="00:15:00"
        nowIndicator
        selectable
        selectMirror
        unselectAuto={false}
        editable
        eventStartEditable
        eventDurationEditable
        height="auto"
        slotMinHeight={28}
        slotEventOverlap={false}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        events={events}
        select={select}
        dateClick={(info) =>
          calendar.current?.getApi().select(info.date, new Date(info.date.getTime() + 3600000))
        }
        eventDrop={move}
        eventResize={move}
        eventDidMount={({ el, event }) => {
          el.dataset.eventId = event.id;
        }}
        eventClick={(info: EventClickInfo) => {
          // A click opens the block's actions; it never completes the task.
          const task = tasks.find((t) => t.id === info.event.id);
          if (task) {
            menu.open(
              { kind: "box", rect: info.el.getBoundingClientRect() },
              taskMenu(task, () => editor.edit(task.id)),
            );
          }
        }}
        slotHeaderFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        dayHeaderContent={(info) => (
          <div className="flex items-baseline gap-2 px-2.5 pt-2 pb-2.5">
            <span className={cn("text-[13px] lowercase", info.isToday ? "text-sodium" : "text-ash")}>
              {info.weekdayText}
            </span>
            <span
              className={cn(
                "text-[22px] font-semibold tracking-[-0.02em]",
                info.isToday ? "text-sodium" : "text-bone",
              )}
            >
              {info.dayNumberText}
            </span>
            <span className="ml-auto font-mono text-[11px] text-ash-dim">
              {formatDuration(loadByDate.get(toIsoDate(info.date)) ?? 0)}
            </span>
          </div>
        )}
        dayHeaderClass={({ isToday }) =>
          cn("border-b bg-ground", isToday ? "border-sodium" : "border-line")
        }
        slotHeaderClass="pr-2.5 text-right font-mono text-[11px] text-ash-dim"
        slotLaneClass={({ isMinor }) => (isMinor ? "border-t border-line/25" : "border-t border-line/50")}
        dayLaneClass={({ isToday }) => cn("border-l border-line/50", isToday && "bg-sodium/[0.03]")}
        highlightClass="pointer-events-none rounded-[9px] border-[1.5px] border-dashed border-sodium bg-sodium/[0.12]"
        columnEventClass={({ event, isMirror }) =>
          cn(
            "animate-fade-in cursor-pointer overflow-hidden rounded-[9px] border px-2 py-1.5 transition-[opacity,filter,box-shadow] duration-150 hover:brightness-125 hover:shadow-[0_6px_18px_rgb(0_0_0/0.35)]",
            isMirror
              ? "border-[1.5px] border-dashed border-sodium bg-sodium/[0.12]"
              : TINT_CLASSES[(event.extendedProps.tint as Tint) ?? "neutral"],
            event.extendedProps.done && "opacity-50",
          )
        }
        columnEventTitleClass={({ event }) =>
          cn(
            "text-[13px] leading-tight font-medium text-bone",
            event.extendedProps.done && "text-ash line-through",
          )
        }
        // The end resizer is just an element FullCalendar renders in this slot:
        // without a theme nobody sizes it, so there would be no grab zone.
        columnEventAfterClass={({ isEndResizable }) =>
          isEndResizable && "absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
        }
        columnEventTimeClass="font-mono text-[10.5px] text-ash"
        nowIndicatorLineClass="border-t-[1.5px] border-sodium"
        nowIndicatorDotClass="size-[9px] rounded-full bg-sodium"
      />
    </div>
  );
}
