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
- Complete with undo; delete with "hold to delete" and undo.
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
| D7 | **FullCalendar v7** (`@fullcalendar/react` 7.1.x, a single package with subpaths) wrapped in a single `WeekCalendar` adapter. Own styling via CSS, no FullCalendar themes. | Ships range selection by dragging, snapping, now indicator and move/resize out of the box. The adapter isolates the FC API from the rest of the app. | Own calendar (more code); react-big-calendar (no rich selection); v6 packages (separate `@fullcalendar/timegrid`, `/interaction`, `/core`) — **do not install**. |
| D8 | **Motion with CSS only** (transitions, keyframes, `@starting-style`). | No dependencies; runs off the main thread; already specified in the *Motion system* board. | `motion`/framer-motion. |
| D9 | **Tests with `node --test`** (Node 24 runs TypeScript natively) only for `domain/` and `server/`. | Zero dependencies; covers the highest-risk logic (parser, views, validation, ownership). | Vitest/Jest (new dependency); UI tests (out of scope). |
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

**Dependency direction (rule):** `app → features → components/ds → components/ui → lib`. `features/*/domain` imports no React, no Next, nothing outside itself. `features/calendar` may import `features/tasks/domain` and `features/tasks/client`; never the reverse. `components/ds` does not import from `features`.

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
  startMin: number | null;  // 0..1439, multiple of 5; requires date !== null
  durationMin: number;      // 0..1440; 0 = no duration
  priority: Priority;
  tag: string | null;       // lowercase, no "#", /^[\p{L}\d_-]{1,32}$/u
  done: boolean;
  steps: Step[];            // max 50
  note: string;             // max 5000 chars
  createdAt: string;        // ISO UTC
  updatedAt: string;        // ISO UTC
};

export type TaskDraft = { title: string } &
  Partial<Pick<Task, "date" | "startMin" | "durationMin" | "priority" | "tag" | "note">>;
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateDraft(input: unknown): Result<TaskDraft>;
export function validatePatch(input: unknown): Result<TaskPatch>;
export function applyPatch(task: Task, patch: TaskPatch, nowIso: string): Result<Task>; // re-validates invariants
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
  tag: string | null;
  tokens: LineToken[];                           // in order of appearance
};

export function parseLine(text: string, today: string /* YYYY-MM-DD */): ParsedLine;
```

Exact grammar (each token separated by spaces; first match wins; the rest stays in the title). Keywords are English:

| Token | Pattern | Result | Chip label |
|---|---|---|---|
| 24 h time | `H:MM` / `HH:MM` (0–23, 00–59) | `startMin` | `time 15:30` |
| 12 h time | `Ham` / `Hpm` (1–12) | `startMin` | `time 15:00` |
| Duration | `~Nm` / `~Nh` | `durationMin` | `for 45 min` / `1 h 30` |
| Priority | `!` `!!` `!!!` | `priority` 1–3 | `priority low/medium/high` |
| Tag | `#word` | `tag` | `tag #work` |
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
export function hourLoad(tasks: Task[], today: string, fromH: number, toH: number): number[];
export function defaultDateFor(lens: Lens, today: string): string | null; // today→today, next→today+1, inbox→null
```

`buildSpine` rules: *today* = `date === today`; *next* = `date > today` (ordered by date and time); *inbox* = `date === null`. Timed tasks first, ordered by `startMin`; the `now` marker only in *today*, before the first task with `startMin > nowMin` (at the end if none). Untimed tasks afterwards, under a `heading`. `overdue = lens==="today" && !done && startMin !== null && startMin + max(durationMin,0) < nowMin`.

**`time.ts`** — `addDays(iso, n)`, `toIsoDate(d: Date)`, `formatHM(min)` → `"09:05"`, `formatDuration(min)` → `"45 min"` | `"1 h"` | `"1 h 30"`, `dayTitle(d)` → `{ name: "Friday", num: "Oct 17" }`, `shiftOf(hour)` → `"morning" | "afternoon" | "evening"`, `weekRange(today)` → `{ from, to }` (Monday–Sunday).

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

**Deep:** hides the query key, optimistic updates, rollback and undo toasts. Nobody else touches `queryClient` for tasks.

```ts
export function useTasks(): { tasks: Task[]; isLoading: boolean; isError: boolean };   // queryKey ['tasks']

export function useTaskActions(): {
  create(draft: TaskDraft): void;          // optimistic with a temporary id; replaced on confirmation
  update(id: string, patch: TaskPatch): void;
  toggle(id: string): void;                // on completion shows toast "Done · Undo" (4 s)
  remove(id: string): void;                // optimistic; real DELETE after 4 s unless "Undo"
};
```

Rules: `staleTime` 60 s; `onError` → rollback + `toast.error`; no `invalidateQueries` on every mutation (only after an error). `tasks-api.ts` is private to the module (not imported outside `client/`).

### 5.5 QuickAdd and the calendar

`QuickAddProvider` (minimal context, `features/tasks/components/quick-add.tsx`) exposes:

```ts
type QuickAddApi = {
  setPendingRange(r: { date: string; startMin: number; durationMin: number } | null): void;
  focus(): void;
};
export function useQuickAdd(): QuickAddApi;
```

`WeekCalendar` calls `setPendingRange` + `focus` on `select`. On Enter, `QuickAdd` does `create({ ...parsed, ...pendingRange })` (the range wins over a typed time), clears the range and calls `calendar.unselect()` via a registered callback. Esc clears range and text.

---

## 6. File system

```
manage-my-tasks/
├── docs/ARCHITECTURE.md  docs/SPEC.md
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # fonts, <html class="dark">, Providers, Toaster
│   │   ├── globals.css                # tokens + base + motion utilities (section 8)
│   │   ├── page.tsx                   # redirect("/today")
│   │   ├── providers.tsx              # "use client": QueryClientProvider (+ devtools in dev)
│   │   ├── (dev)/ds/page.tsx          # design system catalogue (404 in production)
│   │   ├── (app)/
│   │   │   ├── layout.tsx             # AppShell + QuickAddProvider + QuickAdd
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
│   │   │   │   ├── spine.ts           spine.test.ts
│   │   │   │   └── time.ts            time.test.ts
│   │   │   ├── server/
│   │   │   │   ├── task-store.ts
│   │   │   │   ├── tasks.ts           tasks.test.ts
│   │   │   │   └── default-tasks.ts   # instance wired to session + memory store
│   │   │   ├── client/
│   │   │   │   ├── tasks-api.ts       # private
│   │   │   │   ├── use-tasks.ts       # useTasks, useTaskActions
│   │   │   │   └── use-now.ts         # current time without hydration mismatch
│   │   │   └── components/
│   │   │       ├── app-shell.tsx      # header + LensTabs + container
│   │   │       ├── day-header.tsx
│   │   │       ├── day-spine.tsx      # client; receives lens
│   │   │       ├── task-row.tsx
│   │   │       ├── task-detail.tsx    # sentence editing + steps + note
│   │   │       ├── sentence-token.tsx # underlined token + Popover
│   │   │       ├── quick-add.tsx      # QuickAdd + QuickAddProvider + useQuickAdd
│   │   │       └── day-aside.tsx      # Today's rhythm · Syntax
│   │   └── calendar/
│   │       ├── to-calendar-events.ts  to-calendar-events.test.ts
│   │       ├── week-calendar.tsx      # FullCalendar adapter ("use client")
│   │       └── week-calendar.css      # FC styles using tokens
│   ├── components/
│   │   ├── ui/                        # shadcn (vendored; edit only variants/classes)
│   │   └── ds/                        # design system primitives (section 9.1)
│   │       ├── tick.tsx  chip.tsx  hold-button.tsx  duration-rule.tsx
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
| No animation | typing, Enter in QuickAdd, shortcuts, calendar drag | 0 ms |

Rules: animate only `transform`, `opacity`, `filter`, `clip-path`, colours; never `transition: all`; hover only under `@media (hover:hover) and (pointer:fine)`; `prefers-reduced-motion: reduce` → fades only (no translate/scale/blur), no marker pulse.

**Accessibility:** text contrast ≥ 4.5:1 (3:1 at ≥ 24 px); real controls (`button`, `a`, `input`); `aria-label` on icon buttons; visible focus `ring-2 ring-sodium/60`; colours that must be told apart also differ in luminance.

---

## 9. Component suite

### 9.1 Primitives — `src/components/ds/` (presentational, no data, no `features`)

| Component | Props (interface) | States | Built on | Board |
|---|---|---|---|---|
| `Tick` | `checked: boolean; onCheckedChange(v: boolean): void; label: string; disabled?: boolean` | idle, hover, pressed (scale .9), checked (moss + drawn check), disabled | `components/ui/checkbox` (radix), restyled | Today |
| `Chip` | `tone: "sodium" \| "neutral" \| "hint"; kind?: string; children` | enters with `animate-chip-in`; `hint` = dashed border | `span` | Today, QuickAdd |
| `HoldButton` | `onConfirm(): void; label: string; holdMs?: number (700); children (icon)` | idle, holding (ember fill), cancelled (returns in 200 ms) | `button`; pointer **and** keyboard (hold Space/Enter) | Today, Motion |
| `DurationRule` | `minutes: number; done?: boolean; max?: number (120)` | empty (0), partial, full; moss if `done` | `span` | Today |
| `PriorityBars` | `priority: Priority` | 0–3 sodium bars; `aria-label` "Priority medium" | `span` | Today |
| `NowMarker` | `label: string` | soft pulse; no pulse with reduced-motion | `div` | Today, Week |
| `SegmentMeter` | `segments: boolean[]; label: string` | moss segment = done | `div` | Today (header) |
| `LensTabs` | `items: { href: string; label: string; count?: number; disabled?: boolean }[]; activeHref: string` | sliding indicator, 112 px per tab | `next/link` + `nav` | Today, Week |

shadcn components used (vendored, restyled only through tokens/variants): `button`, `input`, `checkbox`, `popover` (**add** with `npx shadcn@latest add popover`), `dropdown-menu`, `tooltip`, `sonner`, `separator`, `collapsible`. Popovers use `transform-origin: var(--radix-popover-content-transform-origin)`.

### 9.2 Feature components — `src/features/tasks/components/`

| Component | Responsibility | Uses | Exact notes |
|---|---|---|---|
| `AppShell` | Header + `LensTabs` + 1120 px container (1360 px on `/week`) | `DayHeader`, `LensTabs` | Client: `usePathname()` decides the active tab and the width. |
| `DayHeader` | Kicker "Better Tasks · {shift} shift", day title, "N of M done · {focus} focus left", `SegmentMeter` | `useTasks`, `daySummary` | Client (depends on tasks and time). |
| `DaySpine` | List for the view with vertical spine, `NowMarker`, headings, empty state | `useTasks`, `buildSpine`, `TaskRow` | `lens` prop. Recomputes `nowMin` every 60 s. Empty state: "Nothing here." + help text. |
| `TaskRow` | Time, node, `Tick`, title with animated strikethrough, tag, `DurationRule`, `PriorityBars`, `HoldButton` (visible on hover/focus) | `useTaskActions` | Click on the title opens `TaskDetail` inline (one open at a time). |
| `TaskDetail` | Editable title, sentence with `SentenceToken`s, steps, note | `useTaskActions` | Saves on blur / Enter. Steps have their own "Add a step and press Enter" input. |
| `SentenceToken` | Underlined token that opens a `Popover` to edit day, time, duration, priority, tag | `popover` | Duration: 15m/30m/45m/1h shortcuts + slider; shows "Ends HH:MM". |
| `QuickAdd` | The **floating** Line: fixed, centred, `bottom: 120px` (mobile: `16px` + safe-area), max 680 px, `rounded-panel`, shadow | `parseLine`, `useTaskActions`, `useQuickAdd` | Enter creates; Esc clears. With no text it shows `hint` syntax chips. With a pending range it shows a sodium chip "Wed 22 · 15:30 → 17:00 · 1 h 30" and the placeholder "What will you do in this block?". With a missing time (no range and no time in Week) it shows help and does not create. |
| `DayAside` | Today's rhythm (`hourLoad`), syntax table | `useTasks` | Stacks below the list under 900 px. |

Content below `QuickAdd` has `padding-bottom: 280px` so the last row is not covered.

### 9.3 Calendar — `src/features/calendar/`

| File | Responsibility |
|---|---|
| `to-calendar-events.ts` | `toCalendarEvents(tasks: Task[]): EventInput[]` (only `date && startMin !== null`; `start: "YYYY-MM-DDTHH:MM"`, `end` = start + `max(durationMin, 15)`; `classNames: ["bt-ev", "bt-ev--" + tint, done && "is-done"]`) and `fromRange(start: Date, end: Date): { date; startMin; durationMin }`. `tint` by tag: `study→ice`, `personal→moss`, `project→bone`, otherwise `neutral`. |
| `week-calendar.tsx` | The single FullCalendar adapter (section 10). Exposes `<WeekCalendar />` with no FC props leaking out. |
| `week-calendar.css` | FC styles using tokens (background `ground`, lines `#1F2420`, 30-minute slot with a fainter line, selection = dashed sodium border + 12% tint, events with the tints from the *Calendar flow* board, `is-done` = 50% opacity + strikethrough). |

---

## 10. FullCalendar v7 integration (exact)

Install: `npm i --save-exact @fullcalendar/react@7.1.3 temporal-polyfill@1.0.6`. **Do not** install `@fullcalendar/core`, `@fullcalendar/timegrid` or `@fullcalendar/interaction` (those are v6).

```tsx
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import "@fullcalendar/react/skeleton.css";      // structure; no FC theme
import "./week-calendar.css";

<FullCalendar
  plugins={[timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  headerToolbar={false}            // the header is ours (range + ‹ Today ›) via calendarRef.getApi()
  locale="en" firstDay={1}
  allDaySlot={false}
  slotMinTime="07:00:00" slotMaxTime="23:00:00"
  slotDuration="00:30:00" snapDuration="00:15:00"
  nowIndicator
  selectable selectMirror unselectAuto={false}
  editable eventDurationEditable eventStartEditable
  events={toCalendarEvents(tasks)}
  select={(info) => { quickAdd.setPendingRange(fromRange(info.start, info.end)); quickAdd.focus(); }}
  eventDrop={/* update(id, fromRange(start,end)) */}
  eventResize={/* update(id, { durationMin }) */}
  eventClick={/* toggle(id) */}
  eventContent={/* title + mono time, from the board */}
  height="auto"
/>
```

Behaviours: a click without dragging creates a 1 h block (default `selectMinDistance` + adjustment in `fromRange` if it lasts 15 min). Verify in the 7.1.3 types the exact shape of `info.start`/`info.end` (Date vs Temporal) **inside the adapter**; nothing outside `week-calendar.tsx` and `to-calendar-events.ts` knows FullCalendar types.

---

## 11. Implementation sequence

The task-by-task detail is in **`docs/SPEC.md`**; the design system is built there (foundation in phase 1, primitives and the `/ds` catalogue in phase 5) and the later phases are required to use it. Each phase ends with `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` green.

## 12. Definition of done (global)

- Zero imports of `@clerk`, `supabase`, `animate-ui`, `CategoryProvider`, root `types.ts`.
- No `fetch` to `/api/tasks` outside `features/tasks/client/tasks-api.ts`; no use of `queryClient` for tasks outside `use-tasks.ts`.
- No FullCalendar type outside `features/calendar/`.
- `domain/` has no React/Next imports (verifiable with grep).
- `parseLine` tests cover every row of the grammar; `buildSpine` covers the three views and the marker; `tasks` covers validation, 404 by ownership and an invalid patch.
- Every interactive control reachable by keyboard; text ≥ 4.5:1.

## 13. Risks and open questions

| Risk | Mitigation |
|---|---|
| FullCalendar 7.1.3 was published on 2026-10-16 (very recent). | Pin the exact version; if a blocking bug appears, go down to 7.1.2 (2026-10-12), never to v6. |
| Styling FC without a theme may require internal selectors (`.fc-*`). | Everything in `week-calendar.css`; if a selector changes in a patch, only that file is touched. |
| The in-memory store is lost on restart. | Expected (2.2). The `TaskStore` seam is where the DB plugs in. |
| `node --test` requires `.ts` in relative imports of `domain/`. | `allowImportingTsExtensions` in tsconfig; rule in section 6. |

Questions before the spec: none blocking. If a demo seed is wanted in development, decide it in the spec (default: no).
