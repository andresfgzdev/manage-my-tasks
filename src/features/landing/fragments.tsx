import type { LineToken } from "@/features/tasks/domain/parse-line";
import { TOKEN_KIND_LABELS, splitTimeMentions } from "@/features/tasks/domain/parse-line";
import { isLate } from "@/features/tasks/domain/spine";
import { PRIORITY_NAMES } from "@/features/tasks/domain/task";
import type { Priority, Task } from "@/features/tasks/domain/task";
import { formatHM, formatRange } from "@/features/tasks/domain/time";

/* Cropped pieces of the Better Tasks interface, drawn in HTML. Each root carries data-ui. */

/** A timed task as the sketches draw it. */
export type SpineTask = Pick<Task, "id" | "title" | "durationMin" | "priority" | "tags"> & {
  startMin: number;
  fresh?: boolean;
};

/** Server render and first paint use a fixed 10:40 on a Monday, then the visitor's clock. */
export const FALLBACK_NOW = { minute: 640, label: "Monday, Oct 12" };

export const SAMPLE_DAY: SpineTask[] = [
  { id: "a", title: "Plan the week", startMin: 540, durationMin: 30, priority: 0, tags: ["home"] },
  { id: "b", title: "Run by the river", startMin: 660, durationMin: 45, priority: 1, tags: ["health"] },
  { id: "c", title: "Call 13:30 to 15:30", startMin: 810, durationMin: 120, priority: 2, tags: ["work", "home"] },
  { id: "d", title: "Pick up the bike", startMin: 1020, durationMin: 30, priority: 0, tags: ["errands"] },
];

export function TaskText({ title }: { title: string }) {
  return (
    <>
      {splitTimeMentions(title).map((part, i) =>
        part.time ? (
          <mark key={i} className="ui-time">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function Flags({ priority }: { priority: number }) {
  if (!priority) return null;
  return (
    <span className="ui-flag" aria-label={`Priority ${PRIORITY_NAMES[priority as Priority]}`}>
      {"!".repeat(priority)}
    </span>
  );
}

export function Chips({ tokens }: { tokens: LineToken[] }) {
  return (
    <ul className="ui-chips" aria-label="What the line was read as">
      {tokens.map((t, i) => (
        <li key={`${t.kind}-${i}`} className={`ui-chip ui-chip--${t.kind}`}>
          <span className="ui-chip__k">{TOKEN_KIND_LABELS[t.kind]}</span> {t.label}
        </li>
      ))}
    </ul>
  );
}

/** A sketch of the Today spine: hours down the side, tasks placed by minute, a now marker. */
export function DaySketch({
  tasks,
  nowMin,
  fromH = 8,
  toH = 20,
  hourPx = 34,
}: {
  tasks: SpineTask[];
  nowMin: number;
  fromH?: number;
  toH?: number;
  hourPx?: number;
}) {
  const hours = Array.from({ length: toH - fromH + 1 }, (_, i) => fromH + i);
  const y = (min: number) => ((min - fromH * 60) / 60) * hourPx;
  const nowVisible = nowMin >= fromH * 60 && nowMin <= toH * 60;
  return (
    <div className="ui-spine" style={{ height: (toH - fromH) * hourPx + 16 }}>
      {hours.map((h) => (
        <div key={h} className="ui-spine__hour" style={{ top: y(h * 60) }}>
          <span>{formatHM(h * 60).slice(0, 2)}</span>
        </div>
      ))}
      {tasks.map((t) => {
        const past = isLate(t.startMin, t.durationMin, nowMin);
        return (
          <div
            key={t.id}
            className="ui-block"
            data-fresh={t.fresh ? "true" : undefined}
            data-past={past ? "true" : undefined}
            style={{ top: y(t.startMin), height: Math.max(26, (t.durationMin / 60) * hourPx - 3) }}
          >
            <span className="ui-block__title">
              <TaskText title={t.title} />
              <Flags priority={t.priority} />
            </span>
            <span className="ui-block__meta">
              {formatRange(t.startMin, t.durationMin)}
              {t.tags.map((tag) => (
                <span key={tag} className="ui-tag">
                  #{tag}
                </span>
              ))}
            </span>
          </div>
        );
      })}
      {nowVisible && (
        <div className="ui-now" style={{ transform: `translateY(${y(nowMin)}px)` }}>
          <span>now {formatHM(nowMin)}</span>
        </div>
      )}
    </div>
  );
}

export function TodayView({ nowMin }: { nowMin: number }) {
  return (
    <div className="ui-win" data-ui>
      <div className="ui-win__head">
        <strong>Today</strong>
        <span>4 tasks · 3 h 45 planned</span>
      </div>
      <div className="ui-line ui-line--idle">
        <span className="ui-line__ph">Add a task: Dentist 9am ~30m #health</span>
      </div>
      <DaySketch
        tasks={SAMPLE_DAY}
        nowMin={nowMin}
        fromH={Math.min(8, Math.floor(nowMin / 60))}
        toH={Math.min(24, Math.max(21, Math.floor(nowMin / 60) + 1))}
        hourPx={56}
      />
    </div>
  );
}

const NEXT = [
  { day: "Tomorrow", items: [
    { t: "Water the plants", m: "no time", tags: ["home"], p: 0 },
    { t: "Send invoice 10am", m: "10:00 · 20 min", tags: ["work"], p: 2 },
  ] },
  { day: "Monday", items: [
    { t: "Standup 9:15", m: "09:15 · 15 min", tags: ["work"], p: 0 },
    { t: "Draft the trip budget", m: "~1 h", tags: ["home", "money"], p: 1 },
    { t: "Review PR 15:30", m: "15:30 · 45 min", tags: ["work"], p: 2 },
  ] },
  { day: "Wednesday", items: [
    { t: "Haircut 6pm", m: "18:00 · 30 min", tags: ["errands"], p: 0 },
    { t: "Renew the passport", m: "no time", tags: ["admin"], p: 3 },
  ] },
];

export function NextView() {
  return (
    <div className="ui-win" data-ui>
      <div className="ui-win__head">
        <strong>Next</strong>
        <span>7 tasks after today</span>
      </div>
      {NEXT.map((group) => (
        <div key={group.day} className="ui-group">
          <p className="ui-group__day">{group.day}</p>
          {group.items.map((it, i) => (
            <div key={it.t} className="ui-row" data-hover={group.day === "Monday" && i === 2 ? "true" : undefined}>
              <span className="ui-check" aria-hidden />
              <span className="ui-row__title">
                <TaskText title={it.t} />
                <Flags priority={it.p} />
              </span>
              <span className="ui-row__meta">{it.m}</span>
              <span className="ui-row__tags">
                {it.tags.map((tag) => (
                  <span key={tag} className="ui-tag">#{tag}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const INBOX = [
  { t: "Find a plumber for the kitchen tap", tags: ["home"], p: 2, steps: "0/3" },
  { t: "Read the lease renewal", tags: ["admin"], p: 1, steps: "" },
  { t: "Ideas for Ana's birthday", tags: ["family"], p: 0, steps: "2/5" },
  { t: "Sell the old monitor", tags: ["errands"], p: 0, steps: "" },
  { t: "Learn the new deploy script", tags: ["work", "learning"], p: 0, steps: "1/4" },
  { t: "Book a dentist check-up", tags: ["health"], p: 1, steps: "" },
];

export function InboxView() {
  return (
    <div className="ui-win" data-ui>
      <div className="ui-win__head">
        <strong>Inbox</strong>
        <span>6 tasks with no date</span>
      </div>
      <div className="ui-line ui-line--idle">
        <span className="ui-line__ph">Add a task with no day: it stays here</span>
      </div>
      {INBOX.map((it, i) => (
        <div key={it.t} className="ui-row" data-hover={i === 1 ? "true" : undefined}>
          <span className="ui-check" aria-hidden />
          <span className="ui-row__title">
            {it.t}
            <Flags priority={it.p} />
          </span>
          <span className="ui-row__meta">{it.steps ? `steps ${it.steps}` : ""}</span>
          <span className="ui-row__tags">
            {it.tags.map((tag) => (
              <span key={tag} className="ui-tag">#{tag}</span>
            ))}
          </span>
        </div>
      ))}
      <div className="ui-menu" style={{ top: 214, right: 26 }}>
        <span>Open details</span>
        <span data-on="true">Move to today</span>
        <span>Move to tomorrow</span>
        <span>Set priority</span>
        <span className="ui-menu__danger">Delete</span>
      </div>
    </div>
  );
}

type WeekBlock = { d: number; s: number; len: number; t: string; tag: string; state?: "drag" | "menu" | "resize" | "draft" };

const WEEK: WeekBlock[] = [
  { d: 0, s: 540, len: 30, t: "Standup", tag: "work" },
  { d: 0, s: 600, len: 120, t: "Write report", tag: "work" },
  { d: 1, s: 540, len: 30, t: "Standup", tag: "work" },
  { d: 1, s: 780, len: 60, t: "Lunch, Sam", tag: "home" },
  { d: 2, s: 540, len: 30, t: "Standup", tag: "work" },
  { d: 2, s: 930, len: 60, t: "Review PR", tag: "work", state: "resize" },
  { d: 3, s: 660, len: 90, t: "Call Ana", tag: "work", state: "menu" },
  { d: 3, s: 1020, len: 60, t: "Gym", tag: "health" },
  { d: 4, s: 540, len: 30, t: "Standup", tag: "work" },
  { d: 4, s: 840, len: 90, t: "New block", tag: "", state: "draft" },
];

export function WeekView({ variant = "plain" }: { variant?: "plain" | "drag" }) {
  const fromH = 9;
  const hourPx = 44;
  const days = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"];
  const blocks = variant === "drag"
    ? WEEK.filter((b) => b.state !== "menu" && b.state !== "draft").concat({ d: 3, s: 720, len: 90, t: "Call Ana", tag: "work", state: "drag" })
    : WEEK;
  return (
    <div className="ui-win ui-week" data-ui>
      <div className="ui-win__head">
        <strong>Week 42</strong>
        <span>Oct 12 to 16</span>
      </div>
      <div className="ui-week__days">
        <span />
        {days.map((d, i) => (
          <span key={d} data-d={i} data-today={i === 2 ? "true" : undefined}>{d}</span>
        ))}
      </div>
      <div className="ui-week__grid" style={{ height: 9 * hourPx }}>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="ui-week__h" style={{ top: i * hourPx }}>
            {formatHM((fromH + i) * 60).slice(0, 2)}
          </span>
        ))}
        {blocks.map((b, i) => (
          <div
            key={i}
            className="ui-wblock"
            data-state={b.state}
            data-d={b.d}
            style={{
              ["--d" as string]: b.d,
              left: "calc(40px + (100% - 40px) * (var(--d) - var(--off)) / var(--cols) + 3px)",
              width: "calc((100% - 40px) / var(--cols) - 6px)",
              top: ((b.s - fromH * 60) / 60) * hourPx + 1,
              height: (b.len / 60) * hourPx - 3,
            }}
          >
            <span className="ui-wblock__t">
              <TaskText title={b.t} />
            </span>
            {b.len >= 90 && <span className="ui-wblock__m">{formatRange(b.s, b.len)}</span>}
            {b.state === "resize" && <span className="ui-wblock__grip" aria-hidden />}
          </div>
        ))}
        {variant === "plain" && (
          <div className="ui-menu" style={{ top: 3.6 * hourPx, left: "calc(40px + (100% - 40px) * (3.5 - var(--off)) / var(--cols))" }}>
            <span data-on="true">Open details</span>
            <span>Edit</span>
            <span>Done</span>
            <span>Move to tomorrow</span>
            <span className="ui-menu__danger">Delete</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** The inline details of one task: title, the read-out fields, steps and a note. */
export function TaskPanel({ focus }: { focus?: string | null }) {
  const f = (k: string) => (focus && focus !== k ? "true" : undefined);
  return (
    <div className="ui-win ui-panel" data-ui data-focus={focus ?? undefined}>
      <div className="ui-panel__part" data-dim={f("title")} style={{ height: 120 }}>
        <p className="ui-panel__label">Task</p>
        <p className="ui-panel__title">
          <TaskText title="Review PR 15:30 with Dani" />
        </p>
        <p className="ui-panel__sub">Today · Monday</p>
      </div>
      <div className="ui-panel__part ui-panel__fields" data-dim={f("time")} style={{ height: 80 }}>
        <span><em>Starts</em>15:30</span>
        <span><em>Lasts</em>45 min</span>
        <span><em>Ends</em>16:15</span>
      </div>
      <div className="ui-panel__part" data-dim={f("priority")} style={{ height: 80 }}>
        <p className="ui-panel__label">Priority</p>
        <div className="ui-seg">
          <span>None</span><span>Low</span><span data-on="true">Medium</span><span>High</span>
        </div>
      </div>
      <div className="ui-panel__part" data-dim={f("tags")} style={{ height: 80 }}>
        <p className="ui-panel__label">Tags</p>
        <div className="ui-panel__tags">
          <span className="ui-tag ui-tag--pill">#work</span>
          <span className="ui-tag ui-tag--pill">#reviews</span>
          <span className="ui-tag ui-tag--add">+ tag</span>
        </div>
      </div>
      <div className="ui-panel__part" data-dim={f("steps")} style={{ height: 180 }}>
        <p className="ui-panel__label">Steps 2 of 4</p>
        <ul className="ui-steps">
          <li data-done="true">Pull the branch</li>
          <li data-done="true">Run the tests locally</li>
          <li>Check the migration</li>
          <li>Leave comments</li>
        </ul>
      </div>
      <div className="ui-panel__part" data-dim={f("note")} style={{ height: 130 }}>
        <p className="ui-panel__label">Note</p>
        <p className="ui-panel__note">Dani asked for eyes on the date parsing. Compare with the old importer before approving.</p>
      </div>
    </div>
  );
}
