# Better Tasks — Architecture, file system and design system

> Base document for implementing the **V1 · Night shift** design (canvas: https://claude.ai/artifact/MgUsvL1csc3mKbpCi8R1ja, page V1, including the *Calendar* section).
> The task spec (`docs/SPEC.md`) is written from this document. If something is not here, **do not build it**.

Date: 2026-10-17 · Fixed stack: Next.js 16.4 · React 19.3 · TypeScript 6.0 · Tailwind 4.3 · shadcn (radix-ui) · TanStack Query 5.104 · FullCalendar 7.1 (new).

**Language convention:** everything is in English: documentation, code, identifiers, commit messages **and the app UI copy** (including the keywords the Line parser recognises and the route names). Translation may be added later; it is out of scope now.

---

## 0. How to use this document (for whoever implements it, human or AI)

1. The **interfaces** in section 5 are the contract: signature, invariants and errors. You may change the implementation, not the interface, without updating this doc.
2. The **decisions** in section 4 are not re-discussed during implementation. If one does not hold up, stop and ask.
3. **Anti-overengineering rules** (apply to the whole project):
   - Add no dependencies. The only new ones allowed are `@fullcalendar/react` and its peer `temporal-polyfill` (section 10). No zod, zustand, date-fns, framer-motion, extra clsx, or new icon libraries (`lucide-react` is already there).
   - No "just in case" abstractions: no generic factories, no `BaseRepository<T>`, no hooks that merely wrap another hook, no barrels (`index.ts`) except those listed in section 6.
   - A seam exists only if something varies behind it. The only hypothetical seam accepted is `TaskStore` (the real database arrives in the next phase).
   - Do not write code for section 2.2 (out of scope), even if it is "easy".
   - If a new file does not appear in the tree in section 6, do not create it without updating the tree.
4. Vocabulary: domain terms from the glossary (section 3); architecture terms from *codebase-design*: **module, interface, depth, seam, adapter, leverage, locality**.

---

## 1. Findings on the current state

Analysis with `tidy-tree` (discover + inventory, read-only) and the *improve-codebase-architecture* review.

**How it is organised today (observed):** layer-first (`components/`, `hooks/`, `lib/`, `context/`, `providers/`), 47 files, 0 tests, `@/` alias in 74% of imports, kebab-case/lowercase file names, no barrels (1/13). Clean dependency direction: `app → components → hooks/lib`, 0 cycles, 0 layer violations.

| # | Finding | Evidence | Consequence |
|---|---|---|---|
| H1 | **The React Query cache is scattered.** The `["tasks", userId, category]` keys and optimistic updates repeat in `hooks/use-tasks.ts`, `hooks/use-subtasks.ts` and `components/tasks/task-item.tsx` (which writes to the cache by hand). | 3 files know the cache shape; one cache per category | **Shallow** module: every caller must know which keys to touch. Sync bugs between "all" and each category. |
| H2 | **`types.ts` at the root is a grab-bag** imported by every layer. | fan-in of 12 | No locality: the Task type does not live with its logic. |
| H3 | **Identity travels from the client.** `userId` arrives via query string and body. | `app/api/tasks/route.ts` | Anyone can read/delete other users' tasks. A session seam exists (`lib/session.ts`) but the server does not use it. |
| H4 | **Subtasks as a separate resource** (`/api/subtasks`) with duplicated logic. | duplicated `DELETE` between `api/tasks` and `api/subtasks` | Two routes and two hooks for a single aggregate. |
| H5 | **Time is text** (`time: "15:30"`) and the day does not exist as a date. | `types.ts` | A calendar or "Next" view is impossible without changing the model. |
| H6 | **Code the V1 design no longer uses**: sidebar (661 lines, 12/24 exports unused), `CategoryProvider`, landing, `/dashboard`. | inventory | Dead weight that confuses the implementer. |
| H7 | Expected noise (do not act): unused exports in `components/ui/*` (vendored shadcn). | inventory | Leave them; shadcn exports whole families. |

---

## 2. Scope

### 2.1 In
- **Today**, **Next** and **Inbox** views (the day spine) and **Week** (calendar with range selection).
- **The Line**: global floating quick add, with syntax for time, duration, priority, tag and day.
- **Open task** inline, with sentence editing, steps and a note.
- Complete with a tick; delete with a two-step delete button (no undo: the UI is the feedback).
- Design system (tokens + primitives) and the component suite from sections 8–9.
- **In-memory** persistence behind `TaskStore`.

### 2.2 Out (do not implement)
Real authentication · database · task sharing and any people/shared UI (not even as a teaser) · time zones · recurring tasks · notifications · dragging from Inbox to the calendar · calendar month/day views · swipe gestures on mobile · global keyboard shortcuts · light mode · i18n (the UI is English only for now) · UI/e2e tests · the "V1.1" improvements discussed earlier (free gaps, re-allocating sodium, etc.).

---

## 3. Glossary

| Term | In code | Definition |
|---|---|---|
| Task | `Task` | The user's unit of work. Aggregate: includes its steps and its note. |
| Step | `Step` | Sub-item of a task (formerly "subtask"). Lives inside `Task.steps`. |
| The Line | `QuickAdd` | Floating input that creates tasks from text with syntax. |
| Token / chip | `LineToken` | Recognised fragment of the Line (`15:30`, `~45m`, `!!`, `#tag`, `tomorrow`). |
| Lens / view | `Lens` / route | Today, Next, Inbox, Week. Each lens is a route. |
| Day spine | `DaySpine` | Vertical list with a timeline, now marker and headings. |
| Now | `NowMarker` | Marker of the current time in the spine and in the calendar. |
| Inbox | lens `inbox` | Tasks without a date (`date === null`). |
| "Whenever" | heading | Tasks dated today but without a time. |
| Remaining focus | `focusLeftMin` | Sum of `durationMin` of today's tasks that are not done. |
| Block | range selection | Range dragged in Week, pending a title. |

---

## 4. Decisions (not re-discussed during implementation)

| ID | Decision | Why | Rejected |
|---|---|---|---|
| D1 | **Hybrid feature-first structure inside `src/`** (section 6). | The V1 design creates two areas with their own logic (tasks, calendar). Grouping domain + data + components per area gives **locality**; `src/` separates code from configuration. *tidy-tree note:* the observed repo is layer-first; this change is an explicit redesign decision, not a fix for outliers. | Keep layer-first (task logic would stay spread over 5 folders); feature folders per route inside `app/` (mixes routing with domain). |
| D2 | **A single query: `['tasks']` returns all of the user's tasks; views are derived on the client** with pure functions. | Removes H1: one cache, one place for optimistic updates. Personal volume (hundreds of tasks) fits without paging. | One query per view/category (the cause of H1); pagination (YAGNI until there is a DB). |
| D3 | **Wall-clock date, no time zone:** `date: "YYYY-MM-DD" \| null` + `startMin: number \| null` + `durationMin`. | A personal task "at 15:30" means 15:30 wherever the user is. Zero zone conversion, zero libraries. | ISO `start` with offset (forces zone handling); `Date` in the model (ambiguous serialisation). |
| D4 | **Steps are embedded in `Task`.** `/api/subtasks` is removed. | One aggregate, one route, one optimistic update. Resolves H4. | Separate resource (current duplication). |
| D5 | **Route Handlers + React Query** for data. No Server Actions. | React Query is part of the fixed stack; Route Handlers give a simple, testable HTTP seam. Server Functions dispatch serially and would duplicate the pattern. | Server Actions + `useOptimistic`. |
| D6 | **Identity exists only on the server** via `getCurrentUserId()` (`src/lib/session.ts`). The client never sends `userId`. | Resolves H3 and leaves the seam ready for real auth. | Passing `userId` from the client. |
| D7 | **FullCalendar v7** (`@fullcalendar/react` 7.1.x, a single package with subpaths) wrapped in a single `WeekCalendar` adapter. Styled with Tailwind classes through its `*Class` options (v7 class names are obfuscated, so selectors on `.fc-*` are not an option), no FullCalendar themes and no CSS file. | Ships range selection by dragging, snapping, now indicator and move/resize out of the box. The adapter isolates the FC API from the rest of the app. | Own calendar (more code); react-big-calendar (no rich selection); v6 packages (separate `@fullcalendar/timegrid`, `/interaction`, `/core`) — **do not install**. |
| D8 | **Motion with CSS only** (transitions, keyframes, `@starting-style`). | No dependencies; runs off the main thread; already specified in the *Motion system* board. | `motion`/framer-motion. |
| D9 | **Tests with `node --test`** (Node 24 runs TypeScript natively) for `domain/`, `server/`, the framework-free sync core in `client/task-sync.ts` and the calendar's pure module. | Zero dependencies; covers the highest-risk logic (parser, views, validation, ownership, optimistic writes). | Vitest/Jest (new dependency); UI tests (out of scope). |
| D10 | **Dark mode only.** `<html class="dark">` fixed, no toggle; the light theme block is removed. | Design requirement. | Theming with `next-themes` (the package is kept only because `components/ui/sonner.tsx` imports it; set `theme="dark"`). |
| D11 | **The view is the route**: `/today`, `/next`, `/inbox`, `/week`. | Shareable URL, back button, no global category context. | State in context (`CategoryProvider`, removed). |
| D12 | **Fonts:** DM Sans (primary, variable `wght` + `opsz`) and JetBrains Mono (times, durations, metadata), via `next/font/google`. | Requirement. Both verified in `next/font` 16.4 as variable fonts. | The canvas fonts (Schibsted Grotesk / Spline Sans Mono) are replaced. |

---

## 5. Architecture

### 5.1 Module map

```
                    ┌──────────────────────── src/app (routing only) ────────────────────────┐
                    │ (app)/layout.tsx → AppShell + QuickAdd    today|next|inbox|week         │
                    │ api/tasks/route.ts   api/tasks/[id]/route.ts   (thin HTTP adapters)     │
                    └───────────┬───────────────────────────────────────────┬────────────────┘
                                │ render                                    │ call
             ┌──────────────────▼─────────────────┐            ┌────────────▼─────────────┐
             │ features/tasks/components           │            │ features/tasks/server    │
             │ features/calendar/components        │            │  tasks module (deep)     │
             └───────┬──────────────────┬──────────┘            │  validate · own · persist│
                     │ hooks            │ pure fns              └──────┬────────────┬──────┘
          ┌──────────▼─────────┐  ┌─────▼──────────────────┐           │ seam       │ seam
          │ features/tasks/    │  │ features/tasks/domain  │◄──────────┘            │
          │ client (deep)      │  │ parseLine · buildSpine │              ┌─────────▼────────┐
          │ useTasks           │  │ validate · time        │              │ TaskStore        │
          │ useTaskActions     │  └────────────────────────┘              │ memory adapter   │
          └──────────┬─────────┘                                          └──────────────────┘
                     │ fetch /api/tasks                    lib/session.ts → getCurrentUserId()
                     ▼
          components/ds (primitives)  ·  components/ui (vendored shadcn)
```

**Dependency direction (rule):** `app → features → components/ds → components/ui → lib`. `features/*/domain` imports no React, no Next, nothing outside itself. `features/calendar` may import `features/tasks/domain`, `features/tasks/client` and the three task entry points every view shares: `useQuickAdd`, `useTaskEditor` and `useTaskMenu`; never the reverse. `features/landing` may import `features/tasks/domain` and the clock (`client/use-now.ts`), nothing else. `components/ds` does not import from `features`.

### 5.2 Domain module — `src/features/tasks/domain/`

Pure functions. No React, no `fetch`, no implicit `Date.now()` (the time enters as an argument). Relative imports **with the `.ts` extension** (required by `node --test`).

**`task.ts`**

```ts
export type Priority = 0 | 1 | 2 | 3;            // 0 none · 1 low · 2 medium · 3 high
export type Step = { id: string; title: string; done: boolean };

export type Task = {
  id: string;
  title: string;            // 1..200 chars, trimmed
  date: string | null;      // local "YYYY-MM-DD"; null = Inbox
  startMin: number | null;  // 0..1439 (any minute); requires date !== null
  durationMin: number;      // 0..1440; 0 = no duration
  priority: Priority;
  tags: string[];           // max 8, each lowercase, no "#", /^[\p{L}\p{M}\d_-]{1,32}$/u
  done: boolean;
  steps: Step[];            // max 50
  note: string;             // max 5000 chars
  createdAt: string;        // ISO UTC
  updatedAt: string;        // ISO UTC
};

export type TaskDraft = { title: string } &
  Partial<Pick<Task, "date" | "startMin" | "durationMin" | "priority" | "tags" | "note">>;
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateDraft(input: unknown): Result<TaskDraft>;
export function validatePatch(input: unknown): Result<TaskPatch>;
export function applyPatch(task: Task, patch: TaskPatch, nowIso: string): Result<Task>; // re-validates invariants
export function newTask(draft: TaskDraft, id: string, nowIso: string): Task;            // the defaults, for server and client
export function normalizeTag(raw: string): string | null;                               // the one tag rule
export const MAX_TAGS = 8, MAX_DURATION = 1440;
export const PRIORITY_NAMES: readonly ["none", "low", "medium", "high"];
```

Invariants guaranteed by `validate*`/`applyPatch`: `startMin !== null ⇒ date !== null`; ranges from the table; unknown keys → error. Error messages are short English copy (they may reach the UI).

**`parse-line.ts`**

```ts
export type LineTokenKind = "time" | "duration" | "priority" | "tag" | "day";
export type LineToken = { kind: LineTokenKind; label: string };   // label ready for the chip

export type ParsedLine = {
  title: string;                                 // text without tokens, spaces collapsed, first letter capitalised
  date: string | null | undefined;               // undefined = the text did not specify a day
  startMin: number | null;
  durationMin: number;
  priority: Priority;
  tags: string[];
  tokens: LineToken[];                           // in order of appearance
};

export function parseLine(text: string, today: string /* YYYY-MM-DD */): ParsedLine;
export const TOKEN_KIND_LABELS: Record<LineTokenKind, string>;  // "at", "lasts", "priority", "tag", "day"
```

Exact grammar (each token separated by spaces; first match wins; the rest stays in the title). Keywords are English:

| Token | Pattern | Result | Chip label |
|---|---|---|---|
| 24 h time | `H:MM` / `HH:MM` (0–23, 00–59) | `startMin` | `time 15:30` |
| 12 h time | `Ham` / `Hpm` (1–12) | `startMin` | `time 15:00` |
| Range | `13:30 to 15:30`, `13:30-15:30`; a bare start takes the end's am/pm (`1:30-3pm` → 13:30) | `startMin` + `durationMin` | `time 13:30` + `lasts 2 h` |
| Duration | `~Nm` / `~Nh` | `durationMin` | `for 45 min` / `1 h 30` |
| Priority | `!` `!!` `!!!` | `priority` 1–3 | `priority low/medium/high` |
| Tag | `#word`, `#a,b` | `tags` | `tag #work` |
| Day | `today` / `tomorrow` | `date` | `day tomorrow` |

If there is a time and no day → `date = today`. Nothing more: no "at 3", no "on monday", no recurrence (out of scope).

**`spine.ts`**

```ts
export type Lens = "today" | "next" | "inbox";
export type SpineItem =
  | { type: "task"; task: Task; overdue: boolean }
  | { type: "now"; label: string }               // "14:12"
  | { type: "heading"; label: string };          // "Whenever" | "No date"

export function buildSpine(tasks: Task[], lens: Lens, today: string, nowMin: number): SpineItem[];
export function lensCounts(tasks: Task[], today: string): Record<Lens, number>;
export function daySummary(tasks: Task[], today: string): {
  done: number; total: number; focusLeftMin: number; segments: boolean[]; // segments ordered by time
};
export function hourPlan(tasks: Task[], today: string, fromH: number, toH: number): { blocks: number; minutes: number }[];
export function defaultDateFor(lens: Lens, today: string): string | null; // today→today, next→today+1, inbox→null
export function lensOf(task: Pick<Task, "date" | "done">, today: string): Lens | null;
export function isLate(startMin: number, durationMin: number, nowMin: number): boolean;
```

`buildSpine` rules: *today* = `date === today`, **plus unfinished tasks from earlier days** (carried over, always overdue, sorted first and always before `now`); *next* = `date > today` (ordered by date and time); *inbox* = `date === null`. Finished tasks from earlier days are in no lens. Timed tasks first, ordered by date and `startMin`; the `now` marker only in *today*, before the first of today's tasks with `startMin > nowMin` (at the end if none). Untimed tasks afterwards, under a `heading`. `overdue` (today only) = not done and either dated before today or `isLate(startMin, durationMin, nowMin)`.

**`edit.ts`** — the vocabulary of edits every editing surface uses, so none re-derives a task rule: `setDay(date)` (removing the day removes the time), `setTime(task, startMin, today)` (a time on an undated task puts it on today), `readTimeText`, `clampDuration`, `readTags` / `formatTags`, `toggleStep`, `addStep`, `editAll(fields, today)` (the edit dialog), `PRIORITY_CHOICES`, `DURATION_SHORTCUTS`.

**`line.ts`** — The Line's policy. `placeLine(text, today, where)` with `where = { view: Lens } | { view: "week"; block: Block | null }` returns `{ line, draft, lands, needsTime }`: the block wins over typed times, a typed day wins over the view, without a day the task goes to the view it was typed in (Week: today), and on Week a task needs a time. `describeDraft(draft, today)` reads a draft back as a sentence. QuickAdd and the landing both use it.

**`time.ts`** — `addDays(iso, n)`, `toIsoDate(d: Date)`, `minuteOfDay(d)`, `formatHM(min)` → `"09:05"`, `formatDuration(min)` → `"45 min"` | `"1 h"` | `"1 h 30"`, `formatRange(start, duration)` → `"13:30 → 15:30"` (wraps midnight), `dayTitle(d)` / `isoDayTitle(iso)` → `{ name: "Friday", num: "Oct 17" }`, `relativeDay(date, today)` → `"today" | "tomorrow" | "Oct 20" | "no date"`, `weekTitle(from, to)` → `"Oct 12–18"` / `"Oct 26 – Nov 1"`, `formatBlock(date, start, duration)` → `"Wed 22 · 15:30 → 17:00 · 1 h 30"`, `shiftOf(hour)`, `weekRange(today)` → `{ from, to }` (Monday–Sunday), `isoWeek(iso)`. Components never parse ISO dates or call `Date` getters for labels themselves.

### 5.3 Server module — `src/features/tasks/server/`

**Deep:** validates, applies ownership, persists. Route handlers only translate HTTP ↔ `Result`.

```ts
// task-store.ts — the only hypothetical seam accepted (D1 note)
export interface TaskStore {
  list(userId: string): Promise<Task[]>;
  get(userId: string, id: string): Promise<Task | null>;
  put(userId: string, task: Task): Promise<void>;          // insert or replace
  remove(userId: string, id: string): Promise<boolean>;
}
export function createMemoryTaskStore(backing?: Map<string, Map<string, Task>>): TaskStore;
// isolated by default (tests); default-tasks.ts passes a map kept on globalThis so data survives HMR

// tasks.ts
export type TasksModule = {
  list(): Promise<Task[]>;
  create(input: unknown): Promise<Result<Task>>;
  update(id: string, input: unknown): Promise<Result<Task>>;
  remove(id: string): Promise<Result<null>>;
};
export function createTasksModule(deps: {
  store: TaskStore;
  userId: () => Promise<string>;
  now: () => Date;
  newId: () => string;
}): TasksModule;

// default-tasks.ts — the instance used by the route handlers
export const tasks: TasksModule;   // memory store + getCurrentUserId + Date + crypto.randomUUID
```

Errors: validation → `{ ok:false, error }` (HTTP 400); another user's task or a missing one → `"not_found"` (HTTP 404). `tasks.ts` and `task-store.ts` do not import `server-only` (so they run under `node --test`); `default-tasks.ts` imports `src/lib/session.ts`, which does.

**HTTP contract** (`src/app/api/tasks/…`):

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/api/tasks` | — | `200 Task[]` |
| POST | `/api/tasks` | `TaskDraft` | `201 Task` · `400 {error}` |
| PATCH | `/api/tasks/[id]` | `TaskPatch` | `200 Task` · `400` · `404` |
| DELETE | `/api/tasks/[id]` | — | `204` · `404` |

### 5.4 Client module — `src/features/tasks/client/`

**Deep:** hides the query key, the QueryClient, optimistic writes, their ordering, rollback and the copy in `localStorage`. Nobody else touches `queryClient` for tasks.

```ts
// use-tasks.tsx
export function TasksProvider({ children }): JSX.Element;   // in (app)/layout.tsx: QueryClient + sync + storage
export function useTasks(): { tasks: Task[]; isLoading: boolean; isError: boolean };   // queryKey ['tasks']
export function useTaskActions(): {                         // one stable object for the whole app
  create(draft: TaskDraft): { id: string; saved: Promise<boolean> };  // optimistic, temporary id
  update(id: string, patch: TaskPatch): void;               // refused locally if applyPatch refuses it
  toggle(id: string): void;
  duplicate(id: string): void;                              // copies steps under new ids
  remove(id: string): void;                                 // optimistic; comes back if the server refuses
};
export function isUnsaved(task: Task): boolean;             // created here, not confirmed yet

// task-sync.ts — framework-free core, tested with a fake adapter
export type TasksAdapter = { list; create; update; remove };  // tasks-api.ts in the app
export function createTaskSync(deps: { api: TasksAdapter; publish(tasks: Task[]): void }): TaskSync;
```

Rules: the visible list is always the last server state with the pending writes replayed on top (built with `newTask` and `applyPatch`, so client and server agree). Writes to one task go out one at a time, so answers never overtake newer edits; writes made to a task still being created wait for its real id instead of being dropped. A list that left before a write was confirmed cannot undo it. A refused write drops that write and reloads the list; a refused create resolves `saved` to `false` and QuickAdd gives the text back. `staleTime` 5 min, no refetch on focus. The request starts when the provider is created, and the last confirmed list is painted from `localStorage` meanwhile. `tasks-api.ts` is private to the module (not imported outside `client/`). There are no toasts and no undo: the UI itself is the feedback.

`use-now.ts` — `useNow(): { date, today, minute } | null`: one shared clock (one timer, aligned to the minute), `null` on the server and during hydration.

### 5.5 QuickAdd and the calendar

`QuickAddProvider` (minimal context, `features/tasks/components/quick-add.tsx`) exposes:

```ts
type QuickAddApi = {
  pending: { date: string; startMin: number; durationMin: number } | null;
  setPendingRange(r: { date: string; startMin: number; durationMin: number } | null): void;
  focus(): void;
};
export function useQuickAdd(): QuickAddApi;
```

`WeekCalendar` calls `setPendingRange` + `focus` on `select`. On Enter, `QuickAdd` creates `placeLine(text, today, where).draft` (the range wins over a typed time), clears the range, and the calendar unselects when `pending` becomes `null`. Esc clears range and text. `/today?line=…` (the landing's closing form) puts that line in the box, ready for Enter.

---

## 6. File system

```
manage-my-tasks/
├── docs/ARCHITECTURE.md  docs/SPEC.md
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # fonts, <html class="dark"> (server only: no providers)
│   │   ├── globals.css                # tokens + base + motion utilities (section 8)
│   │   ├── page.tsx                   # the landing
│   │   ├── (app)/
│   │   │   ├── layout.tsx             # TasksProvider + TooltipProvider + AppShell + QuickAdd
│   │   │   ├── template.tsx           # view entrance
│   │   │   ├── today/page.tsx
│   │   │   ├── next/page.tsx
│   │   │   ├── inbox/page.tsx
│   │   │   └── week/page.tsx
│   │   └── api/tasks/
│   │       ├── route.ts               # GET, POST
│   │       └── [id]/route.ts          # PATCH, DELETE
│   ├── features/
│   │   ├── tasks/
│   │   │   ├── domain/
│   │   │   │   ├── task.ts            task.test.ts
│   │   │   │   ├── parse-line.ts      parse-line.test.ts
│   │   │   │   ├── line.ts            line.test.ts       # The Line's policy
│   │   │   │   ├── edit.ts            edit.test.ts       # the vocabulary of edits
│   │   │   │   ├── spine.ts           spine.test.ts
│   │   │   │   └── time.ts            time.test.ts
│   │   │   ├── server/
│   │   │   │   ├── task-store.ts
│   │   │   │   ├── tasks.ts           tasks.test.ts
│   │   │   │   └── default-tasks.ts   # instance wired to session + memory store
│   │   │   ├── client/
│   │   │   │   ├── tasks-api.ts       # private
│   │   │   │   ├── task-sync.ts       task-sync.test.ts  # framework-free optimistic core
│   │   │   │   ├── use-tasks.tsx      # TasksProvider, useTasks, useTaskActions
│   │   │   │   └── use-now.ts         # the shared clock, without hydration mismatch
│   │   │   └── components/
│   │   │       ├── app-shell.tsx      # header + LensTabs + container
│   │   │       ├── day-header.tsx
│   │   │       ├── day-spine.tsx      # client; receives lens
│   │   │       ├── task-row.tsx
│   │   │       ├── task-detail.tsx    # sentence editing + steps + note
│   │   │       ├── sentence-token.tsx # underlined token + Popover
│   │   │       ├── quick-add.tsx      # QuickAdd + QuickAddProvider + useQuickAdd
│   │   │       ├── task-editor.tsx    # the edit dialog + useTaskEditor
│   │   │       ├── task-menu.tsx      # useTaskMenu: the actions of a task (row and block)
│   │   │       └── day-aside.tsx      # Today's rhythm · Syntax
│   │   ├── calendar/
│   │   │   ├── to-calendar-events.ts  to-calendar-events.test.ts  # events, ranges, week totals
│   │   │   ├── week-view.tsx          # lazy, client-only boundary
│   │   │   └── week-calendar.tsx      # FullCalendar adapter ("use client"); styled with Tailwind classes
│   │   └── landing/                   # static landing; reads the tasks domain, never the app
│   ├── components/
│   │   ├── ui/                        # shadcn (vendored; edit only variants/classes)
│   │   └── ds/                        # design system primitives (section 9.1)
│   │       ├── tick.tsx  chip.tsx  delete-button.tsx  duration-rule.tsx  app-menu.tsx
│   │       ├── priority-bars.tsx  now-marker.tsx  segment-meter.tsx  lens-tabs.tsx
│   └── lib/
│       ├── session.ts                 # getCurrentUserId(): Promise<string>  (server-only)
│       └── utils.ts                   # cn()
├── components.json  tsconfig.json  eslint.config.mjs  next.config.ts  package.json  .npmrc
```

Conventions: files in **kebab-case**; **co-located** tests (`*.test.ts`); **no barrels**; `@/*` → `./src/*` alias outside `domain/`; inside `domain/`, relative imports with `.ts`. Server components by default; `"use client"` only on those with state/events.

### 6.1 Migration map

| Today | Destination |
|---|---|
| `app/layout.tsx`, `app/globals.css` | `src/app/…` (rewritten) |
| `app/page.tsx` (landing) | deleted → `src/app/page.tsx` redirects to `/today` |
| `app/dashboard/**` | deleted → `src/app/(app)/**` |
| `app/api/tasks/route.ts` | `src/app/api/tasks/route.ts` + `[id]/route.ts` (thin, call `tasks`) |
| `app/api/subtasks/route.ts` | deleted (D4) |
| `lib/data/*` | `src/features/tasks/server/*` (redone with the 5.3 interface) |
| `types.ts` | `src/features/tasks/domain/task.ts` |
| `hooks/use-tasks.ts`, `hooks/use-subtasks.ts` | `src/features/tasks/client/use-tasks.ts` |
| `hooks/use-current-user.ts` | deleted (D6) |
| `hooks/use-mobile.ts` | deleted together with the sidebar |
| `context/CategoryProvider.tsx` | deleted (D11) |
| `providers/ReactQueryClientProvider.tsx` | `src/app/providers.tsx` |
| `components/layout/*` (sidebar, header, greetings) | deleted → `app-shell.tsx`, `day-header.tsx` |
| `components/tasks/*` | rewritten in `src/features/tasks/components/` |
| `components/ui/sidebar.tsx`, `sheet.tsx`, `skeleton.tsx`, `card.tsx`, `badge.tsx`, `label.tsx`, `select.tsx` | deleted if unused at the end (verify with grep) |
| `lib/constants.ts`, `formatTimeForDisplay` | deleted (replaced by `time.ts`) |
| `lib/session.ts` | `src/lib/session.ts` (`getCurrentUserId`) |

Configuration changes: `tsconfig.json` → `"paths": { "@/*": ["./src/*"] }` and `"allowImportingTsExtensions": true`; `components.json` → `"css": "src/app/globals.css"`; `package.json` → `"test": "node --test \"src/**/*.test.ts\""`.

---

## 7. Sample data

The in-memory store starts **empty** (the empty state is designed). Tests use their own fixtures. No seed is added.

---

## 8. Design system — tokens

Source of truth: `src/app/globals.css`. Values come from the *Palette and typography* board with two adjustments: fonts (D12) and `--color-ash-dim`, raised to `#8A8D85` to meet 4.5:1 (in the canvas `#5E625B` failed for text).

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  /* surfaces */
  --color-ground: #0F1110;   /* app background */
  --color-surface: #161917;  /* QuickAdd, open task, row hover */
  --color-raise: #1D211E;    /* popovers, toast, neutral chips */
  --color-line: #2A2F2B;     /* borders, spine, separators */
  /* ink */
  --color-bone: #ECE6D8;     /* primary text */
  --color-ash: #9A9C92;      /* secondary text (≥ 4.5:1 on ground) */
  --color-ash-dim: #8A8D85;  /* small mono metadata (≥ 4.5:1) */
  --color-faint: #5E625B;    /* decoration / borders only, never text */
  /* signals */
  --color-sodium: #FF9A3C;       /* now, focus, primary action */
  --color-sodium-soft: #FFB872;  /* text on a sodium tint */
  --color-moss: #8FCB9B;         /* done; personal category */
  --color-ice: #8DB8FF;          /* study category */
  --color-ember: #E5484D;        /* delete */
  --color-ember-soft: #F2777A;   /* delete text on raise or an ember tint */

  --font-sans: var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;

  --radius-chip: 7px;
  --radius-control: 10px;
  --radius-row: 12px;
  --radius-panel: 18px;

  --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);     /* entrances, chips, toast */
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1); /* view indicator */

  --animate-row-in: row-in 320ms var(--ease-out-strong) both;
  --animate-chip-in: chip-in 180ms var(--ease-out-strong) both;
  --animate-wash: wash 1400ms ease-out both;
  --animate-pop: pop 520ms var(--ease-out-strong) both;
  --animate-view-in: view-in 320ms var(--ease-out-strong) both;
  --animate-rise: rise 420ms var(--ease-out-strong) both;
  --animate-fade-in: fade-in 200ms ease-out both;
  --animate-menu-in: menu-in 140ms var(--ease-out-strong) both;
  --animate-shimmer: shimmer 1.6s ease-in-out infinite;
}

/* shadcn: its semantic variables point at the palette (dark only) */
:root {
  color-scheme: dark;
  --radius: 0.75rem;
  --background: var(--color-ground);   --foreground: var(--color-bone);
  --card: var(--color-surface);        --card-foreground: var(--color-bone);
  --popover: var(--color-raise);       --popover-foreground: var(--color-bone);
  --primary: var(--color-sodium);      --primary-foreground: var(--color-ground);
  --secondary: var(--color-raise);     --secondary-foreground: var(--color-bone);
  --muted: var(--color-raise);         --muted-foreground: var(--color-ash);
  --accent: var(--color-raise);        --accent-foreground: var(--color-bone);
  --destructive: var(--color-ember);
  --border: var(--color-line);         --input: var(--color-line);   --ring: var(--color-sodium);
}
```

The `@theme inline { --color-background: var(--background); … }` block that shadcn needs is kept; the `chart-*` and `sidebar-*` variables and the duplicated `.dark` block are removed.

**Typography**

| Role | Class | Font | Size / weight |
|---|---|---|---|
| Day title | `text-[56px] leading-none font-semibold tracking-[-0.03em]` | DM Sans | 56/600 (mobile 40) |
| Open task title | `text-[28px] font-semibold tracking-[-0.02em]` | DM Sans | 28/600 |
| Row text | `text-base font-medium` (priority 3: `font-semibold`) | DM Sans | 16/500 |
| Body | `text-sm` | DM Sans | 14/400 |
| Kicker / section headings | `font-mono text-[11px] uppercase tracking-[0.14em] text-ash` | JetBrains Mono | 11/400 |
| Times, durations, counters | `font-mono tabular-nums text-[13px]` | JetBrains Mono | 12–13/400 |

`next/font`: `DM_Sans({ subsets:["latin"], variable:"--font-dm-sans", axes:["opsz"] })` and `JetBrains_Mono({ subsets:["latin"], variable:"--font-jetbrains-mono" })`, both variable, on `<html>`.

**Spacing and sizes:** Tailwind scale (multiples of 4). Rows ≥ 60 px; touch targets ≥ 44 px; side gutter 24 px (16 px on mobile); content max 1120 px (Week 1360 px).

**Motion (from the *Motion system* board)**

| Interaction | Property | Duration / curve |
|---|---|---|
| Pressing any button | `transform: scale(0.97)` | 140 ms `ease-out-strong` |
| Recognised chip | opacity + scale .95→1 + blur 2px→0 | 180 ms (`animate-chip-in`) |
| Row enters | opacity + translateY 6px + blur | 320 ms, 30 ms cascade, capped at 240 ms |
| New row | sodium wash 16%→0 | 1400 ms (`animate-wash`) |
| Complete | fill 180 ms; check `stroke-dashoffset` 220 ms +60 ms; strikethrough `scaleX` 260 ms from the left | — |
| Hold to delete | `clip-path` 700 ms `linear` on press; 200 ms on release; exit 180 ms | — |
| View indicator | `translateX` | 260 ms `ease-in-out-strong` |
| Toast | translateY 16px + fade | 240 ms |
| Block created in Week | `animate-pop` | 520 ms |
| View changes | opacity + translateY 8px (`animate-view-in`) | 320 ms |
| Shell enters (header, tabs, content) | opacity + translateY 14px, 70 ms cascade (`animate-rise`) | 420 ms |
| Hint, calendar block or hour bar appears | opacity (`animate-fade-in`) | 200 ms |
| Actions menu opens | opacity + scale .96→1 (`animate-menu-in`) | 140 ms |
| Popover / tooltip | tw-animate fade + zoom 95% | 150 ms |
| Loading skeleton | opacity pulse (`animate-shimmer`) | 1.6 s loop |
| Now marker | ring scale + fade (`now-ring`) | 2400 ms loop |
| Hover on a raised surface | `translateY(-1px)` (`lift`) | 160 ms |
| Row leaves (delete) | `grid-template-rows` 1fr→0fr + fade | 220 ms |
| Delete button arms | `grid-template-columns` 0fr→1fr | 200 ms |
| No animation | typing, Enter in QuickAdd, shortcuts, calendar drag | 0 ms |

Rules: animate only `transform`, `opacity`, `filter`, `clip-path`, colours (exceptions: the `grid-template-*` collapses above, the only way to give space back smoothly, and two small reveals: the hour bars' `height` when the plan changes and the time-mention X's `max-width`); never `transition: all`; hover only under `@media (hover:hover) and (pointer:fine)`; `prefers-reduced-motion: reduce` → every animation and transition drops to 1 ms, pressed controls keep their size and `lift` does not rise: nothing moves, no marker pulse.

**Accessibility:** text contrast ≥ 4.5:1 (3:1 at ≥ 24 px); real controls (`button`, `a`, `input`); `aria-label` on icon buttons; visible focus `ring-2 ring-sodium/60`; colours that must be told apart also differ in luminance.

---

## 9. Component suite

### 9.1 Primitives — `src/components/ds/` (presentational, no data, no `features`)

| Component | Props (interface) | States | Built on | Board |
|---|---|---|---|---|
| `Tick` | `checked: boolean; onCheckedChange(v: boolean): void; label: string; disabled?: boolean` | idle, hover, pressed (scale .9), checked (moss + drawn check), disabled | the radix `Checkbox` primitive (shadcn's bakes in its own indicator) | Today |
| `Chip` | `tone: "sodium" \| "neutral" \| "hint"; kind?: string; children` | enters with `animate-chip-in`; `hint` = dashed border | `span` | Today, QuickAdd |
| `DeleteButton` | `onConfirm(): void; label: string` | idle, armed (second press confirms), disarms on leave | `button` | Today |
| `DurationRule` | `minutes: number; label: string; done?: boolean; max?: number (120)` (the caller formats `label`, so `ds` never imports from `features`) | empty (0), partial, full; moss if `done` | `span` | Today |
| `PriorityBars` | `priority: Priority` | 0–3 sodium bars; `aria-label` "Priority medium" | `span` | Today |
| `NowMarker` | `label: string` | soft ring (transform + opacity only); no ring with reduced-motion | `div` | Today, Week |
| `SegmentMeter` | `segments: boolean[]; label: string` | moss segment = done | `div` | Today (header) |
| `LensTabs` | `items: { href: string; label: string; count?: number; disabled?: boolean; onWarm?(): void }[]; activeHref?: string` (defaults to `usePathname()`) | sliding indicator, 112 px per tab; `onWarm` on hover/focus/touch | `next/link` + `nav` | Today, Week |

shadcn components used (vendored, restyled only through tokens/variants): `button`, `input`, `checkbox`, `popover` (**add** with `npx shadcn@latest add popover`), `dropdown-menu`, `tooltip`, `sonner`, `separator`, `collapsible`. Popovers use `transform-origin: var(--radix-popover-content-transform-origin)`.

### 9.2 Feature components — `src/features/tasks/components/`

| Component | Responsibility | Uses | Exact notes |
|---|---|---|---|
| `AppShell` | Header + `LensTabs` + 1120 px container (1360 px on `/week`) | `DayHeader`, `LensTabs` | Client: `usePathname()` decides the active tab and the width. |
| `DayHeader` | Kicker "Better Tasks · {shift} shift", day title, "N of M done · {focus} focus left", `SegmentMeter` | `useTasks`, `daySummary` | Client (depends on tasks and time). |
| `DaySpine` | List for the view with vertical spine, `NowMarker`, headings, empty state | `useTasks`, `buildSpine`, `TaskRow` | `lens` prop. Recomputes `nowMin` every 60 s. Empty state: "Nothing here." + help text. |
| `TaskRow` | Time, node, `Tick`, title with animated strikethrough, tag, `DurationRule`, `PriorityBars`, `HoldButton` (visible on hover/focus) | `useTaskActions` | Click on the title opens `TaskDetail` inline (one open at a time). |
| `TaskDetail` | Editable title, sentence with `SentenceToken`s, steps, note | `useTaskActions` | Saves on blur / Enter. Steps have their own "Add a step and press Enter" input. |
| `SentenceToken` | Underlined token that opens a `Popover` to edit day, time, duration, priority, tags | `popover`, `edit.ts` | Duration: the shared shortcuts + slider; shows "Ends HH:MM". The slider and the time input edit a local draft and save once (release, blur, Enter or close). |
| `QuickAdd` | The **floating** Line: fixed, centred, `bottom: 120px` (mobile: `16px` + safe-area), max 680 px, `rounded-panel`, shadow | `parseLine`, `useTaskActions`, `useQuickAdd` | Enter creates; Esc clears. With no text it shows `hint` syntax chips. With a pending range it shows a sodium chip "Wed 22 · 15:30 → 17:00 · 1 h 30" and the placeholder "What will you do in this block?". With a missing time (no range and no time in Week) it shows help and does not create. |
| `DayAside` | Today's rhythm (`hourPlan`), syntax table | `useTasks` | Stacks below the list under 900 px. |

Content below `QuickAdd` has `padding-bottom: 280px` so the last row is not covered.

### 9.3 Calendar — `src/features/calendar/`

| File | Responsibility |
|---|---|
| `to-calendar-events.ts` | Pure data, no FullCalendar types. `toCalendarEvents(tasks): CalendarEvent[]` (only tasks with `date` and `startMin`; `start`/`end` as `"YYYY-MM-DDTHH:MM"` wall-clock strings, `end` = start + `max(durationMin, 15)`, rolling over midnight; `extendedProps: { tint, done }`; tint by tag: `study→ice`, `personal→moss`, `project→bone`, otherwise `neutral`) and `fromRange(start: Date, end: Date)`: `{ date, startMin, durationMin }` rounded to 5 min, never past midnight (moves and resizes); `fromSelection(start, end)`: the same, but a single 15 min click becomes 60 min (new blocks); `weekTotals(tasks, from, to)`: planned minutes for the week and per day, counting only the blocks the calendar draws. |
| `week-calendar.tsx` | The single FullCalendar adapter (section 10). Owns the week header (kicker with the ISO week, range title, planned time, ‹ Today ›). Exposes `<WeekCalendar />` with no FC props leaking out. Every option it passes keeps its identity between renders (module-level constants, handlers through a ref): FullCalendar compares options by identity. |
| `week-view.tsx` | `next/dynamic` with `ssr: false`: FullCalendar loads only on Week (warmed on tab hover/focus) and never renders on the server. |

---

## 10. FullCalendar v7 integration (exact)

Install: `npm i --save-exact @fullcalendar/react@7.1.3 temporal-polyfill@1.0.6`. **Do not** install `@fullcalendar/core`, `@fullcalendar/timegrid` or `@fullcalendar/interaction` (those are v6; `@fullcalendar/core` 7.x arrives on its own as a dependency of `react`).

What v7 does differently, and how this project deals with it:

| v7 fact | Consequence |
|---|---|
| Internal class names are obfuscated (`.fc-rk`, `.fc-wY`…). | No CSS file and no `.fc-*` selectors. Everything is styled with Tailwind classes passed through the `*Class` options (`dayHeaderClass`, `slotLaneClass`, `dayLaneClass`, `highlightClass`, `columnEventClass`, `columnEventTitleClass`, `columnEventTimeClass`, `nowIndicatorLineClass`, `nowIndicatorDotClass`…). Tokens only, no hex. |
| Without a theme plugin nothing sizes the event resizer; it is just the element in the `columnEventAfterClass` slot. | `columnEventAfterClass` returns `absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize` when `isEndResizable`. Without it events cannot be resized. |
| `unselectAuto={false}` keeps the selection highlight over the grid. | `highlightClass` includes `pointer-events-none`, otherwise the highlight blocks dragging the events under it. |
| The API comes from `useCalendarController()` (prev/next/today/getDate) and a `ref` (`getApi().select/unselect`). | The header buttons call the controller; a `useEffect` calls `unselect()` when `pending` becomes `null`. |
| `start`/`end` in callbacks are `Date`, in local time. | `fromRange` reads local getters; nothing outside `to-calendar-events.ts` and `week-calendar.tsx` knows FullCalendar types. |

```tsx
import FullCalendar, { useCalendarController } from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import "@fullcalendar/react/skeleton.css";      // structure only; no theme

<FullCalendar
  ref={calendar} controller={controller}
  plugins={[timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  headerToolbar={false}            // the header is ours
  locale="en" firstDay={1}
  allDaySlot={false}
  slotMinTime="07:00:00" slotMaxTime="23:00:00"
  slotDuration="00:30:00" snapDuration="00:15:00"
  height="auto" slotMinHeight={28}  // 56 px per hour; the page scrolls, not the calendar
  slotEventOverlap={false}          // overlapping events sit side by side
  eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
  slotHeaderFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
  nowIndicator
  selectable selectMirror unselectAuto={false}
  editable eventStartEditable eventDurationEditable
  events={toCalendarEvents(tasks)}
  select={(info) => { setPendingRange(fromSelection(info.start, info.end)); focus(); }}
  dateClick={(info) => api.select(info.date, info.date + 1 h)}   // a click creates a 1 h block
  eventDrop={drop}                         // update(id, { date, startMin }): moving keeps the length
  eventResize={resize}                     // update(id, fromRange(event.start, event.end))
  eventClick={openTaskMenu}                // the block's actions; a click never completes the task
/>
```

---

## 11. Implementation sequence

The task-by-task detail is in **`docs/SPEC.md`**; the design system is built there (foundation in phase 1, primitives in phase 5) and the later phases are required to use it. Each phase ends with `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` green.

## 12. Definition of done (global)

- Zero imports of `@clerk`, `supabase`, `animate-ui`, `CategoryProvider`, root `types.ts`.
- No `fetch` to `/api/tasks` outside `features/tasks/client/tasks-api.ts`; no use of `queryClient` for tasks outside `use-tasks.tsx`.
- No FullCalendar type outside `features/calendar/`.
- `domain/` has no React/Next imports (verifiable with grep).
- `parseLine` tests cover every row of the grammar; `buildSpine` covers the three views and the marker; `tasks` covers validation, 404 by ownership and an invalid patch.
- Every interactive control reachable by keyboard; text ≥ 4.5:1.

## 13. Risks and open questions

| Risk | Mitigation |
|---|---|
| FullCalendar 7.1.3 was published on 2026-10-16 (very recent). | Pin the exact version; if a blocking bug appears, go down to 7.1.2 (2026-10-12), never to v6. |
| Styling FC without a theme means every visible part must be given classes. | All of it lives in `week-calendar.tsx`, through the documented `*Class` options (a stable API, unlike the obfuscated internals). |
| The in-memory store is lost on restart. | Expected (2.2). The `TaskStore` seam is where the DB plugs in. |
| `node --test` requires `.ts` in relative imports of `domain/`. | `allowImportingTsExtensions` in tsconfig; rule in section 6. |

Questions before the spec: none blocking. If a demo seed is wanted in development, decide it in the spec (default: no).
