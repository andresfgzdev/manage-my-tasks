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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useAppMenu } from "@/components/ds/app-menu";
import type { MenuItem } from "@/components/ds/app-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTaskActions, useTasks } from "@/features/tasks/client/use-tasks";
import { useQuickAdd } from "@/features/tasks/components/quick-add";
import { useTaskEditor } from "@/features/tasks/components/task-editor";
import { useTaskMenu } from "@/features/tasks/components/task-menu";
import type { Task } from "@/features/tasks/domain/task";
import { formatDuration, isoWeek, toIsoDate, weekRange, weekTitle } from "@/features/tasks/domain/time";
import { fromRange, fromSelection, toCalendarEvents, weekTotals } from "./to-calendar-events";
import type { Tint } from "./to-calendar-events";

// Everything FullCalendar receives keeps its identity between renders: it compares
// options by identity, and a new function would make it reprocess the whole grid.

const PLUGINS = [timeGridPlugin, interactionPlugin];
const TIME_FORMAT = { hour: "2-digit", minute: "2-digit", hour12: false } as const;

const TINT_CLASSES: Record<Tint, string> = {
  ice: "border-ice/30 bg-ice/[0.13]",
  moss: "border-moss/30 bg-moss/[0.13]",
  bone: "border-bone/20 bg-bone/[0.08]",
  neutral: "border-line bg-raise",
};

type ClassArg<K extends string> = { [P in K]: boolean };

const dayHeaderClass = ({ isToday }: ClassArg<"isToday">) =>
  cn("border-b bg-ground", isToday ? "border-sodium" : "border-line");
const slotLaneClass = ({ isMinor }: ClassArg<"isMinor">) =>
  isMinor ? "border-t border-line/25" : "border-t border-line/50";
const dayLaneClass = ({ isToday }: ClassArg<"isToday">) =>
  cn("border-l border-line/50", isToday && "bg-sodium/[0.03]");
type EventArg = { event: { extendedProps: Record<string, unknown> }; isMirror?: boolean };
const columnEventClass = ({ event, isMirror }: EventArg) =>
  cn(
    "animate-fade-in cursor-pointer overflow-hidden rounded-[9px] border px-2 py-1.5 transition-[opacity,filter,box-shadow] duration-150 hover:brightness-125 hover:shadow-[0_6px_18px_rgb(0_0_0/0.35)]",
    isMirror
      ? "border-[1.5px] border-dashed border-sodium bg-sodium/[0.12]"
      : TINT_CLASSES[(event.extendedProps.tint as Tint) ?? "neutral"],
    Boolean(event.extendedProps.done) && "opacity-50",
  );
const columnEventTitleClass = ({ event }: EventArg) =>
  cn("text-[13px] leading-tight font-medium text-bone", Boolean(event.extendedProps.done) && "text-ash line-through");
// The end resizer is just an element FullCalendar renders in this slot:
// without a theme nobody sizes it, so there would be no grab zone.
const columnEventAfterClass = ({ isEndResizable }: ClassArg<"isEndResizable">) =>
  isEndResizable && "absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize";
const eventDidMount = ({ el, event }: { el: HTMLElement; event: { id: string } }) => {
  el.dataset.eventId = event.id;
};

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
  const range = weekRange(toIsoDate(controller.getDate() ?? new Date()));
  const totals = useMemo(() => weekTotals(tasks, range.from, range.to), [tasks, range.from, range.to]);

  // The handlers read the latest render through a ref, so their identity never changes.
  const latest = useRef({ tasks, actions, menu, taskMenu, editor, setPendingRange, focus });
  useLayoutEffect(() => {
    latest.current = { tasks, actions, menu, taskMenu, editor, setPendingRange, focus };
  });
  const findTask = (id: string): Task | undefined => latest.current.tasks.find((t) => t.id === id);
  const openTaskMenu = (task: Task, anchor: Parameters<typeof menu.open>[0]) => {
    const { menu, taskMenu, editor } = latest.current;
    menu.open(anchor, taskMenu(task, () => editor.edit(task.id)));
  };

  const handlers = useMemo(
    () => ({
      select(info: DateSelectInfo) {
        latest.current.setPendingRange(fromSelection(info.start, info.end));
        latest.current.focus();
      },
      dateClick(info: { date: Date }) {
        calendar.current?.getApi().select(info.date, new Date(info.date.getTime() + 3600000));
      },
      // Moving keeps the length; only resizing changes it.
      eventDrop({ event }: EventDropInfo) {
        if (!event.start) return;
        const { date, startMin } = fromRange(event.start, event.end ?? event.start);
        latest.current.actions.update(event.id, { date, startMin });
      },
      eventResize({ event }: EventResizeDoneInfo) {
        if (!event.start || !event.end) return;
        latest.current.actions.update(event.id, fromRange(event.start, event.end));
      },
      // A click opens the block's actions; it never completes the task.
      eventClick(info: EventClickInfo) {
        const task = findTask(info.event.id);
        if (task) openTaskMenu(task, { kind: "box", rect: info.el.getBoundingClientRect() });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- everything is read through `latest`
    [],
  );

  const dayHeaderContent = useCallback(
    (info: { date: Date; isToday: boolean; weekdayText: string; dayNumberText: string }) => (
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
          {formatDuration(totals.byDate[toIsoDate(info.date)] ?? 0)}
        </span>
      </div>
    ),
    [totals],
  );

  // The Line cleared the block (Enter, Esc or the ✕ chip): drop the calendar selection too.
  useEffect(() => {
    if (!pending) calendar.current?.getApi().unselect();
  }, [pending]);
  useEffect(() => () => setPendingRange(null), [setPendingRange]);

  // Right click: on a block it offers that task's actions, elsewhere the week's.
  const openContextMenu = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-event-id]");
    const task = el?.dataset.eventId ? findTask(el.dataset.eventId) : undefined;
    e.preventDefault();
    e.stopPropagation();
    const at = { kind: "point" as const, x: e.clientX, y: e.clientY };
    if (task) return openTaskMenu(task, at);
    const items: MenuItem[] = [
      { type: "action", label: "New task", icon: <Plus />, run: focus },
      { type: "separator" },
      { type: "action", label: "Today", icon: <CalendarDays />, run: () => controller.today() },
      { type: "action", label: "Previous week", icon: <ChevronLeft />, run: () => controller.prev() },
      { type: "action", label: "Next week", icon: <ChevronRight />, run: () => controller.next() },
    ];
    menu.open(at, items);
  };

  return (
    <div className="min-w-0 flex-1 pb-[280px]" onContextMenu={openContextMenu}>
      <header className="flex flex-wrap items-end justify-between gap-5 pb-5">
        <div className="flex flex-col gap-1.5">
          <span className="kicker">Better Tasks · week {isoWeek(range.from)}</span>
          <h1 className="text-[44px] leading-none font-semibold tracking-[-0.03em] max-sm:text-[32px]">
            {weekTitle(range.from, range.to)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-2.5 font-mono text-xs text-ash">
            {formatDuration(totals.plannedMin) || "0 min"} planned
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
        plugins={PLUGINS}
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
        eventTimeFormat={TIME_FORMAT}
        events={events}
        select={handlers.select}
        dateClick={handlers.dateClick}
        eventDrop={handlers.eventDrop}
        eventResize={handlers.eventResize}
        eventDidMount={eventDidMount}
        eventClick={handlers.eventClick}
        slotHeaderFormat={TIME_FORMAT}
        dayHeaderContent={dayHeaderContent}
        dayHeaderClass={dayHeaderClass}
        slotHeaderClass="pr-2.5 text-right font-mono text-[11px] text-ash-dim"
        slotLaneClass={slotLaneClass}
        dayLaneClass={dayLaneClass}
        highlightClass="pointer-events-none rounded-[9px] border-[1.5px] border-dashed border-sodium bg-sodium/[0.12]"
        columnEventClass={columnEventClass}
        columnEventTitleClass={columnEventTitleClass}
        columnEventAfterClass={columnEventAfterClass}
        columnEventTimeClass="font-mono text-[10.5px] text-ash"
        nowIndicatorLineClass="border-t-[1.5px] border-sodium"
        nowIndicatorDotClass="size-[9px] rounded-full bg-sodium"
      />
    </div>
  );
}
