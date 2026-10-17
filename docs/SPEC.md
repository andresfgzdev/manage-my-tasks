# Better Tasks V1 — Implementation spec

> Execute this spec **in order**, one task at a time. The reference is `docs/ARCHITECTURE.md` (cited as **[A§n]**). Design: V1 canvas (https://claude.ai/artifact/MgUsvL1csc3mKbpCi8R1ja).
> If a task cannot be fulfilled exactly as written, **stop and ask**. Do not improvise scope.
> **Language:** everything is English — code, docs, commits and all UI copy (see [A§0]). There is no shared-tasks feature, no people UI and no teaser for it anywhere.

---

## Global rules (apply to every task)

1. **Closed scope.** Only create the files the task lists under *Files*. Nothing from [A§2.2].
2. **No new dependencies**, except `@fullcalendar/react@7.1.3` and `temporal-polyfill@1.0.6` in T8.1. Always install with an exact version (`.npmrc` already has `save-exact=true`).
3. **The design system is mandatory.** Every colour, radius, font, curve and animation comes from the tokens in T1.3. Forbidden in components: loose hex (`#…`), `rgb(…)`, Tailwind default-palette colours (`zinc-*`, `purple-*`, `emerald-*`…), `transition-all`, `ease-in`. The only exceptions are `globals.css`, `week-calendar.css` and opacities over tokens (`bg-sodium/10`).
4. **Primitives before markup.** If a primitive in `components/ds/` exists for something (checkbox, chip, duration bar…), use it. Do not re-implement it inline.
5. **No extra abstractions:** no barrels, no generic helpers, no hooks that merely wrap another hook, no "just in case" props. Props are exactly those in [A§9].
6. **UI copy in English**, exactly as written in the tasks. Do not add Spanish strings anywhere.
7. **Verification at the end of every task** (all must pass):
   ```bash
   npx tsc --noEmit && npm run lint && npm test && npm run build
   ```
   (`npm test` exists from T1.4; before that, skip it.)
8. **One commit per task**, message `feat(T<id>): <summary>` (or `chore`/`test` as appropriate). Do not push.
9. At the end of each task, review its **Do not** list: if anything from it entered the diff, remove it.

---

## Phase 0 — Preparation

### T0.1 Working branch
- **Steps:** `git switch -c feat/v1-night-shift` from the current HEAD.
- **Acceptance:** branch created; clean tree.

---

## Phase 1 — Base and design system foundation

### T1.1 Move the code to `src/` and adjust configuration
- **Files:** move `app/` → `src/app/`, `components/` → `src/components/`, `lib/` → `src/lib/`, `hooks/` → `src/hooks/`, `context/` → `src/context/`, `providers/` → `src/providers/`, `types.ts` → `src/types.ts` (with `git mv`). Modify `tsconfig.json`, `components.json`.
- **Steps:**
  1. `git mv` each folder/file.
  2. `tsconfig.json`: `"paths": { "@/*": ["./src/*"] }` and add `"allowImportingTsExtensions": true`.
  3. `components.json`: `"css": "src/app/globals.css"`.
- **Acceptance:** `npm run build` passes; the app starts as before.
- **Do not:** change code inside the moved files; rename files.

### T1.2 Remove legacy UI and code
- **Files to delete:** `src/app/dashboard/**`, `src/app/api/subtasks/**`, `src/components/layout/**`, `src/components/tasks/**`, `src/hooks/**`, `src/context/**`, `src/providers/**`, `src/lib/data/**`, `src/lib/constants.ts`, `src/types.ts`, `src/app/api/tasks/route.ts`, `src/components/ui/{sidebar,sheet,skeleton,card,badge,label,select}.tsx`.
- **Files to create/modify:**
  - `src/app/page.tsx` → `import { redirect } from "next/navigation"; export default function Home() { redirect("/today"); }`
  - `src/app/(app)/today/page.tsx`, `next/page.tsx`, `inbox/page.tsx`, `week/page.tsx` → each temporarily returns an `<h1>` with the view name.
  - `src/lib/utils.ts` → keep only `cn()` (delete `formatTimeForDisplay`).
  - `src/app/layout.tsx` → remove `ReactQueryClientProvider` (it returns in T4.1); keep `<Toaster />`.
- **Acceptance:** build green; `/` redirects to `/today`; `grep -r "CategoryProvider\|use-subtasks\|@/types\"" src` is empty.
- **Do not:** create new UI components yet.

### T1.3 Design system tokens in `globals.css`
- **Files:** rewrite `src/app/globals.css`.
- **Steps:**
  1. Copy literally the `@theme { … }` block and the `:root { … }` block from [A§8].
  2. Keep shadcn's `@theme inline` block **only** with: `--color-background/foreground/card/card-foreground/popover/popover-foreground/primary/primary-foreground/secondary/secondary-foreground/muted/muted-foreground/accent/accent-foreground/destructive/border/input/ring` and `--radius-sm/md/lg/xl`. Delete `chart-*`, `sidebar-*`, `--font-inter`, `--font-nunito`, the `.dark { … }` block and the sidebar `@layer base`.
  3. Keep `@custom-variant dark (&:is(.dark *));`.
  4. Add the keyframes:
     ```css
     @keyframes row-in { from { opacity: 0; transform: translateY(6px); filter: blur(2px); } to { opacity: 1; transform: none; filter: none; } }
     @keyframes chip-in { from { opacity: 0; transform: translateY(2px) scale(0.95); filter: blur(2px); } to { opacity: 1; transform: none; filter: none; } }
     @keyframes wash { from { opacity: 0.16; } to { opacity: 0; } }
     @keyframes pop { from { transform: scale(0.97); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-sodium) 70%, transparent); } to { transform: none; box-shadow: 0 0 0 0 transparent; } }
     @keyframes now-pulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-sodium) 35%, transparent); } 50% { box-shadow: 0 0 0 6px transparent; } }
     ```
  5. Utilities:
     ```css
     @utility press { transition: transform 140ms var(--ease-out-strong); &:active { transform: scale(0.97); } }
     @utility kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-ash); }
     ```
  6. Base:
     ```css
     @layer base {
       * { @apply border-border outline-ring/50; }
       body { @apply bg-ground text-bone font-sans antialiased; }
     }
     @media (prefers-reduced-motion: reduce) {
       *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; }
     }
     ```
- **Acceptance:** the classes `bg-ground`, `text-bone`, `text-ash`, `bg-sodium`, `rounded-panel`, `ease-out-strong`, `animate-row-in`, `press`, `kicker` exist (check by compiling a throw-away local page; do not commit it).
- **Do not:** light theme; variables that are not in [A§8].

### T1.4 Fonts, fixed dark mode and test script
- **Files:** `src/app/layout.tsx`, `package.json`, `src/components/ui/sonner.tsx`.
- **Steps:**
  1. `layout.tsx`:
     ```tsx
     import { DM_Sans, JetBrains_Mono } from "next/font/google";
     const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", axes: ["opsz"] });
     const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
     // <html lang="en" className={`dark ${dmSans.variable} ${mono.variable}`}>
     ```
     `metadata.title = "Better Tasks"`. Remove Inter/Nunito and `data-lt-installed`.
  2. `package.json` → `"test": "node --test \"src/**/*.test.ts\""`.
  3. `sonner.tsx` → fixed `theme="dark"` (remove `useTheme`), `position="bottom-center"`, `offset={40}`, `toastOptions.classNames`: `toast: "bg-raise border border-line text-bone rounded-[12px] shadow-[0_12px_32px_rgb(0_0_0/0.45)] font-sans"`, `actionButton: "!bg-transparent !text-sodium font-semibold"`, `description: "text-ash"`.
- **Acceptance:** the HTML carries `class="dark …"` and both font variables; `npm test` runs (0 tests is fine).
- **Do not:** a `next-themes` provider; a theme toggle.

### T1.5 Adapt shadcn to the tokens and add Popover
- **Files:** `src/components/ui/button.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/input.tsx`; new `src/components/ui/popover.tsx`.
- **Steps:**
  1. `npx shadcn@latest add popover` (check that it installs no extra packages; if it installs a package called `cn`, uninstall it and fix the import to `@/lib/utils` — see the earlier incident in the history).
  2. `button.tsx`: in the base add `press` and change `transition-all` → `transition-[color,background-color,border-color,box-shadow]`. Variants: `default` = `bg-sodium text-ground hover:bg-sodium-soft`; `outline` = `border border-line bg-transparent text-bone hover:bg-raise`; `ghost` = `text-ash hover:bg-raise hover:text-bone`; `destructive` = `bg-ember text-ground`. Remove `secondary` and `link` if unused at the end (T9.2).
  3. `input.tsx`: `bg-transparent border-line text-bone placeholder:text-ash-dim focus-visible:ring-sodium/40`.
  4. `popover.tsx`: content with `bg-raise border-line rounded-[14px] origin-(--radix-popover-content-transform-origin)` and entrance animation `data-[state=open]:animate-in fade-in-0 zoom-in-95 duration-150`.
- **Acceptance:** no file in `components/ui` contains `transition-all` or colours outside tokens/semantic variables.
- **Do not:** new variants; rewriting shadcn components.

---

## Phase 2 — Domain (with tests)

All in `src/features/tasks/domain/`. Relative imports **with `.ts`**, no alias, no React/Next. Tests with `node:test` + `node:assert/strict`.

### T2.1 `time.ts` + `time.test.ts`
- **Interface:** [A§5.2 time.ts].
- **Details:** `formatDuration(0)` → `""`; `45` → `"45 min"`; `60` → `"1 h"`; `90` → `"1 h 30"`. `dayTitle` uses English names (`"Friday"`, `"Oct 17"` with abbreviated months `Jan..Dec`). `shiftOf`: <12 `"morning"`, <19 `"afternoon"`, otherwise `"evening"`. `addDays` handles month and year ends.
- **Minimum tests:** each case above + `addDays("2026-12-31", 1) === "2027-01-01"` + `weekRange("2026-10-17")` → `{ from: "2026-10-12", to: "2026-10-18" }`.

### T2.2 `task.ts` + `task.test.ts`
- **Interface:** [A§5.2 task.ts]; invariants and limits from the table.
- **Minimum tests:** minimal valid draft (`{title:"x"}`); empty title → error `"Title is required"`; `startMin` without `date` → error; `startMin: 1440` → error; unknown key → error; `applyPatch` updates `updatedAt` and rejects a patch that breaks invariants.

### T2.3 `parse-line.ts` + `parse-line.test.ts`
- **Interface and grammar:** [A§5.2 parse-line.ts]. `today = "2026-10-17"` in tests. Keywords are English (`today`, `tomorrow`); there is no person token (`+name` is not recognised and stays in the title).
- **Mandatory cases (truth table):**

| Input | title | date | startMin | durationMin | priority | tag |
|---|---|---|---|---|---|---|
| `Review PR 15:30 ~45m !! #work` | `Review PR` | `2026-10-17` | 930 | 45 | 2 | `work` |
| `call 3pm` | `Call` | `2026-10-17` | 900 | 0 | 0 | null |
| `run tomorrow 7:05` | `Run` | `2026-10-18` | 425 | 0 | 0 | null |
| `read ~2h` | `Read` | undefined | null | 120 | 0 | null |
| `25:00 something` | `25:00 something` | undefined | null | 0 | 0 | null |
| `plan +ana` | `Plan +ana` | undefined | null | 0 | 0 | null |
| `!!!! urgent` | `!!!! urgent` | undefined | null | 0 | 0 | null |
| `#Work report` | `Report` | undefined | null | 0 | 0 | `work` |
| `today pay rent` | `Pay rent` | `2026-10-17` | null | 0 | 0 | null |
| `12am sleep` | `Sleep` | `2026-10-17` | 0 | 0 | 0 | null |
| `12pm lunch` | `Lunch` | `2026-10-17` | 720 | 0 | 0 | null |
| `   ` | `` | undefined | null | 0 | 0 | null |

  Also: the `tokens` of the first case = `[{kind:"time",label:"15:30"},{kind:"duration",label:"45 min"},{kind:"priority",label:"medium"},{kind:"tag",label:"#work"}]`.
- **Do not:** extra natural language ("at", "on monday"), recurrence, people.

### T2.4 `spine.ts` + `spine.test.ts`
- **Interface and rules:** [A§5.2 spine.ts].
- **Minimum tests:** *today* orders by time and puts `now` before the first future task; `now` at the end if all have passed; untimed tasks under the heading `"Whenever"`; *next* only `date > today`, ordered by date and time; *inbox* only `date === null`, no `now`; correct `overdue`; `daySummary` (done/total/focusLeftMin/segments); `hourLoad` counts overlaps per hour; `defaultDateFor`.

---

## Phase 3 — Server

### T3.1 Session
- **File:** `src/lib/session.ts` → `import "server-only"; export async function getCurrentUserId(): Promise<string> { return "demo-user"; }` + a one-line comment: entry point for future auth.
- **Do not:** user types, name, avatar.

### T3.2 `task-store.ts`
- **File:** `src/features/tasks/server/task-store.ts`, interface [A§5.3]. `createMemoryTaskStore(backing = new Map())`: isolated by default so every test gets its own store; the long-lived map on `globalThis.__tasksStore` is created in `default-tasks.ts` (T3.4) and passed in. `list` orders by `createdAt` ascending. Returns copies (`structuredClone`), never internal references.

### T3.3 `tasks.ts` + `tasks.test.ts`
- **File:** `src/features/tasks/server/tasks.ts`, interface [A§5.3]. `create` applies defaults: `date: null, startMin: null, durationMin: 0, priority: 0, tag: null, done: false, steps: [], note: ""`.
- **Tests (with `createMemoryTaskStore()` and fake deps):** valid create returns a full Task; invalid create → `{ok:false}`; update of another user's task → `"not_found"`; invalid patch → error without modifying; remove → `ok`, then `update` → `"not_found"`; `list` returns only the user's tasks.
- **`server-only`:** `tasks.ts` and `task-store.ts` do **not** import it (it would break `node --test`). Only the route handlers consume them, and those are already server-side. `src/lib/session.ts` does import it, so `tasks.ts` receives `userId` as a dependency: the default instance (`export const tasks`) lives in `src/features/tasks/server/default-tasks.ts`, which imports `session.ts`; tests import `tasks.ts` directly.

### T3.4 Route handlers
- **Files:** `src/features/tasks/server/default-tasks.ts`, `src/app/api/tasks/route.ts` (GET, POST), `src/app/api/tasks/[id]/route.ts` (PATCH, DELETE).
- **Steps:** `default-tasks.ts` exports `tasks = createTasksModule({ store: createMemoryTaskStore(), userId: getCurrentUserId, now: () => new Date(), newId: () => crypto.randomUUID() })`. Each handler ≤ 15 lines: read the body with `await req.json().catch(() => null)`, call `tasks.*` (imported from `default-tasks.ts`), map `Result` → status from the contract [A§5.3]. In `[id]`, `params` is `Promise<{ id: string }>` (Next 16): `const { id } = await params`.
- **Acceptance (manual with curl):** valid POST 201; POST `{}` 400; PATCH unknown id 404; DELETE 204; GET returns what was created.
- **Do not:** read `userId` from the request; validate in the handler.

---

## Phase 4 — Data client

### T4.1 `use-tasks.ts`, `tasks-api.ts`, `use-now.ts` and providers
- **Files:** `src/features/tasks/client/tasks-api.ts`, `use-tasks.ts`, `use-now.ts`; `src/app/providers.tsx`; `src/app/layout.tsx` (wrap with `<Providers>`).
- **Details:**
  - Interface [A§5.4]. Optimistic `create`: temporary id `tmp-<uuid>`, replaced by the response in `onSuccess`.
  - `toggle`: when it becomes done → `toast("Done", { description: title, action: { label: "Undo", onClick: () => update(id, {done:false}) }, duration: 4000 })`.
  - `remove`: remove from the cache, `toast("Deleted", { action: Undo })`; `setTimeout(4000)` → real DELETE unless undone (restore the cached snapshot).
  - `use-now.ts`: `export function useNow(intervalMs = 60_000): Date | null` with `useSyncExternalStore`; `getServerSnapshot` returns `null` (components that depend on the time render their skeleton while it is `null`, so there is no hydration mismatch).
  - `providers.tsx`: `QueryClient` in `useState`, `defaultOptions.queries.staleTime = 60_000`; `ReactQueryDevtools` only if `process.env.NODE_ENV === "development"`.
- **Acceptance:** `grep -rn "queryKey" src | grep -v client/use-tasks.ts` is empty; `grep -rn "/api/tasks" src | grep -v "client/tasks-api.ts\|app/api"` is empty.
- **Do not:** one query per view; `invalidateQueries` after every mutation.

---

## Phase 5 — Design system primitives

All in `src/components/ds/`, client only if they have state/events. Exact classes (adjustable by ±1 px only if something does not align). Each primitive respects `prefers-reduced-motion` (already global from T1.3).

### T5.1 `tick.tsx`
- Built directly on the radix `Checkbox` primitive (`import { Checkbox } from "radix-ui"`), because the shadcn `Checkbox` renders its own indicator; `components/ui/checkbox.tsx` becomes unused (T9.2 deletes it). Root: `size-[22px] rounded-[7px] border-[1.5px] border-faint bg-transparent transition-[background-color,border-color,transform] duration-[180ms] active:scale-90 data-[state=checked]:bg-moss data-[state=checked]:border-moss focus-visible:ring-2 focus-visible:ring-sodium/60`.
- Check mark: a plain SVG child (not `Indicator`, which unmounts) 14×14 `path d="M3 7.2l2.6 2.6L11 4.4"` `stroke-ground stroke-[2.2]` with `stroke-dasharray:16; stroke-dashoffset:16` → `0` when `checked`, transition 220 ms `ease-out-strong` with a 60 ms delay.
- `aria-label={label}`.

### T5.2 `chip.tsx`
- `inline-flex items-center gap-1.5 h-[26px] px-[9px] rounded-chip font-mono text-xs animate-chip-in`.
- Tones: `sodium` = `text-sodium-soft bg-sodium/10 border border-sodium/30`; `neutral` = `text-bone bg-raise border border-line`; `hint` = `text-ash border border-dashed border-line`.
- `kind` is rendered before the content in `text-ash`.

### T5.3 `hold-button.tsx`
- `button` `relative overflow-hidden size-11 rounded-control text-ash grid place-items-center press`.
- Overlay `absolute inset-0 bg-ember`, `clip-path: inset(0 100% 0 0)`; while held: `inset(0 0 0 0)` with `transition: clip-path {holdMs}ms linear`; if released early: returns with `200ms ease-out-strong`. Icon in `text-ground` while held.
- Logic: `pointerdown`/`keydown` (Space or Enter, no auto-repeat) start a timer of `holdMs`; `pointerup`/`pointerleave`/`keyup`/`blur` cancel it; when it completes it calls `onConfirm()` once. `aria-label={label}`, `title={label}`.

### T5.4 `duration-rule.tsx` and `priority-bars.tsx`
- `DurationRule` (props `minutes`, `label`, `done?`, `max?`; the caller passes the formatted `label`, e.g. `formatDuration(m) || "no duration"`, so `ds` never imports from `features`): track `w-[140px] h-[3px] rounded-sm bg-raise overflow-hidden`; fill `h-full rounded-sm` width `max(6, min(minutes, max)/max*100)%` (0 → 0%), colour `bg-ash` or `bg-moss` if `done`, `transition-colors duration-[220ms]`; text beside it `font-mono text-[11px] text-ash` showing `label`.
- `PriorityBars` (prop type is the literal `0 | 1 | 2 | 3`, not imported from the domain): 3 bars `w-[3px] rounded-[1px]` of height 7/10/13 px, `bg-sodium` if `n <= priority` otherwise `bg-line`; container `aria-label="Priority {none|low|medium|high}"`.

### T5.5 `now-marker.tsx` and `segment-meter.tsx`
- `NowMarker`: row `h-7 flex items-center`; label `w-[52px] text-right font-mono text-xs text-sodium`; dot `size-[9px] rounded-full bg-sodium ml-2.5 animate-[now-pulse_2400ms_ease-in-out_infinite]`; line `flex-1 h-px bg-linear-to-r from-sodium to-transparent`. `aria-label="Now, {label}"`.
- `SegmentMeter`: `flex gap-1 w-full`; each segment `flex-1 h-1.5 rounded-[2px]` `bg-moss` if done, `bg-line` if not, `transition-colors duration-[260ms]`; `aria-label={label}`.

### T5.6 `lens-tabs.tsx`
- `nav` `relative flex border-b border-line overflow-x-auto`; each item `next/link` `w-28 h-11 inline-flex items-center justify-center text-sm text-ash aria-[current=page]:text-bone transition-colors press`; counter `ml-1.5 font-mono text-[11px] text-ash-dim`; `disabled` → `span` `text-faint cursor-not-allowed aria-disabled`.
- Indicator `absolute left-0 -bottom-px w-28 h-0.5 bg-sodium transition-transform duration-[260ms] ease-in-out-strong` with `translateX(index * 112px)`.
- Client. `activeHref` is optional and defaults to `usePathname()`. The indicator sits at `bottom-0` (not `-bottom-px`: that overflows the `overflow-x-auto` nav and shows a vertical scrollbar).

### T5.7 Design system catalogue (removed)
- A `/ds` catalogue page was built once, in development, to verify the primitives in a browser (all states, motion durations, hold-to-delete behaviour) and was then **deleted on purpose**: no catalogue page ships in the repo. Do not recreate it. Verify primitives in the real views (phase 6 onwards).

---

## Phase 6 — Today, Next and Inbox views

### T6.1 `AppShell` and `DayHeader`
- **Files:** `src/features/tasks/components/app-shell.tsx`, `day-header.tsx`; `src/app/(app)/layout.tsx`.
- **Details:** container `min-h-dvh px-6 pt-10 max-sm:px-4` + `mx-auto max-w-[1120px] flex flex-col gap-7` (1360 px on `/week`, decided with `usePathname()`). `DayHeader` (client, `useNow`, `useTasks`): `kicker` "Better Tasks · {shift} shift"; title `text-[56px] max-sm:text-[40px] leading-none font-semibold tracking-[-0.03em]` "{Day} <span class="text-ash font-normal">{Oct 17}</span>"; on the right `font-mono text-[13px] text-ash` "<span class="text-bone">{done}</span> of {total} done · {focus} focus left" + `SegmentMeter`. `LensTabs` with Today (`/today`), Next (`/next`), Inbox (`/inbox`), Week (`/week`) and the counters from `lensCounts` (Week has no counter).
- **Do not:** sidebar; avatar; any disabled or "coming soon" tab.

### T6.2 `TaskRow`
- **File:** `task-row.tsx` (client). Layout [A§9.2] and the *Today* board: time `w-[52px] text-right font-mono text-[13px]` (`text-sodium` if `overdue`, `text-faint` if done, otherwise `text-ash`); spine node `size-[7px] rounded-full border-[1.5px] bg-ground` (moss if done, sodium if overdue, faint otherwise); `Tick`; title `relative text-base font-medium` (priority 3 → `font-semibold`) with a strikethrough line `absolute inset-x-0 top-[55%] h-[1.5px] bg-ash origin-left scale-x-0 transition-transform duration-[260ms] ease-out-strong` → `scale-x-100` if done and title `text-ash`; tag `font-mono text-xs text-ash`; `DurationRule`; `PriorityBars`; `HoldButton` inside a container `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity` (hover only in `@media (hover:hover)`: use the variant `[@media(hover:hover)]:group-hover:opacity-100`).
- Labels: Tick `"Complete"` / `"Mark as pending"`; HoldButton `"Hold to delete"`.
- Row: `group relative min-h-[60px] rounded-row animate-row-in` with `style={{ animationDelay: min(i*30,240)ms }}`; newly created row: layer `absolute inset-0 rounded-row bg-sodium animate-wash pointer-events-none`.
- Click on the title opens `TaskDetail` (T7.2) inline; until T7.2 it does nothing.

### T6.3 `DaySpine`
- **File:** `day-spine.tsx` (client). `lens: Lens` prop. Uses `useTasks`, `useNow`, `buildSpine`. Vertical line `absolute left-[66px] inset-y-0 w-px bg-line`. Renders `TaskRow`, `NowMarker`, headings (`kicker pl-[90px] pt-7 pb-2.5`). Empty state: "Nothing here." (`text-lg font-semibold`) + "Type in the line below; anything with a time lands in its slot." (`text-sm text-ash`). While `useNow()` is `null` or `isLoading`: 4 skeleton rows `h-[60px] rounded-row bg-surface/60`. Container with `pb-[280px]`.

### T6.4 `QuickAdd` + `QuickAddProvider`
- **File:** `quick-add.tsx` (client). Interface [A§5.5].
- **Position:** `fixed left-1/2 -translate-x-1/2 bottom-[120px] max-sm:bottom-[calc(16px+env(safe-area-inset-bottom))] w-[min(680px,calc(100%-32px))] z-10`.
- **Panel:** `bg-surface border border-line rounded-panel px-[18px] pt-4 pb-3 flex flex-col gap-3 shadow-[0_22px_50px_rgb(0_0_0/0.55)] transition-[border-color,box-shadow] duration-200 focus-within:border-sodium/40 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-sodium)_8%,transparent),0_22px_50px_rgb(0_0_0/0.55)]`.
- **Content:** prompt `›` `font-mono text-xl text-sodium`; `input` (hidden label "New task") `bg-transparent text-[18px] caret-sodium outline-none w-full`; indicator `font-mono text-[11px]` "↵ create" (`text-sodium` if there is a valid title, otherwise `text-faint`); row of `Chip`s: tokens from `parseLine` (`time`/`day` → `sodium`, the rest `neutral`), with `kind` labels: time → `"time"`, duration → `"for"`, priority → `"priority"`, tag → `"tag"`, day → `"day"`; with no text → `hint` chips: `15:30`, `~45m`, `!!`, `#tag`, `tomorrow`.
- **With a pending range:** `sodium` chip with a calendar icon "{short day} {d} · HH:MM → HH:MM · {duration}" + ✕ button (`aria-label="Remove block"`); placeholder "What will you do in this block?".
- **Enter:** `create({ title, date: pending?.date ?? parsed.date ?? defaultDateFor(routeLens, today), startMin: pending?.startMin ?? parsed.startMin, durationMin: pending?.durationMin ?? parsed.durationMin, priority, tag })`; clears text and range; keeps focus. No title → does nothing. On `/week` with no range and no time → help text "Missing a time: select a block or type a time like 15:30." and does not create. **Esc:** clears text and range.
- **Do not:** autocomplete; animate while typing; extra natural language; people.

### T6.5 `DayAside`
- **File:** `day-aside.tsx`. Two sections with `h2.kicker`: *Today's rhythm* (16 bars 07–22 h from `hourLoad`, height `6 + load*22` px, current-hour bar `bg-sodium`, with load `bg-faint`, empty `bg-raise`; labels 07/12/17/22 `font-mono text-[11px] text-ash-dim`); *Line syntax* (5-row table: `15:30 · 3pm` time, `~45m · ~2h` duration, `! !! !!!` priority, `#work` tag, `today · tomorrow` day).
- Page layout: `flex flex-wrap gap-12`; list `flex-[999_1_560px] min-w-0`; aside `flex-[1_1_260px] min-w-0`.
- **Do not:** any shared/people/threads block.

### T6.6 Pages
- `today/page.tsx`, `next/page.tsx`, `inbox/page.tsx`: `<div className="flex flex-wrap gap-12"><DaySpine lens="…" /><DayAside /></div>` (`DayAside` only on Today). `(app)/layout.tsx`: `QuickAddProvider` > `AppShell` > `{children}` + `<QuickAdd />`.
- **Acceptance (manual):** creating `Review PR 15:30 ~45m !! #work` puts it in Today at its time; `tomorrow` sends it to Next; with no time and no day in Inbox it stays in Inbox; completing shows a toast with Undo; holding the trash icon for 700 ms deletes with Undo.

---

## Phase 7 — Open task

### T7.1 `SentenceToken`
- **File:** `sentence-token.tsx` (client). Props: `label: string; children` (popover content). Trigger: `button` `px-0.5 border-b-[1.5px] border-dashed border-faint text-bone` (open: `border-solid border-sodium text-sodium-soft`). Content: `PopoverContent` from T1.5.
- Editors inside (in the same file, not exported except the token): day (Today / Tomorrow / No date / `input type="date"`), time (`input type="time"` step 300), duration (buttons 15m/30m/45m/1h + `input type="range"` 5–240 step 5 + text "Ends HH:MM"), priority (4 buttons: None / Low / Medium / High), tag (`input`).

### T7.2 `TaskDetail`
- **File:** `task-detail.tsx` (client). Mounted inside `TaskRow` when open (state in `DaySpine`: `openId`; one at a time; Esc closes).
- **Layout (*Open task* board):** `ml-[66px] my-3 bg-surface border border-line rounded-[18px] px-8 py-7 flex flex-col gap-6 shadow-[0_24px_60px_rgb(0_0_0/0.45)]`, entrance `animate-row-in`. Title `input` `text-[28px] font-semibold tracking-[-0.02em] bg-transparent`. Sentence `text-[19px] leading-[1.9] text-ash`: "Do it {day} at {time}, for {duration}, with {priority} priority, tagged {#tag}." (omit empty clauses and show the token with text like "add time"). Steps: kicker "Steps · {done} of {total}" + `SegmentMeter` with one segment per step, each step with a small `Tick` (18 px via `className`) and text, input "Add a step and press Enter". Note: `textarea` `bg-ground border border-line rounded-row text-sm` with placeholder "Notes".
- **Saving:** each change calls `update(id, patch)` on confirmation (blur/Enter/popover selection). No "Save" button.
- **Do not:** modal; drawer; sharing or people; teasers.

---

## Phase 8 — Week (calendar)

### T8.1 Install FullCalendar and the pure adapter
- `npm i @fullcalendar/react@7.1.3 temporal-polyfill@1.0.6`.
- **File:** `src/features/calendar/to-calendar-events.ts` + `to-calendar-events.test.ts`, interface [A§9.3]. Type `EventInput` locally as `{ id: string; title: string; start: string; end: string; classNames: string[] }` (do not import FC types here, so the test runs under `node --test`).
- **Tests:** excludes tasks without `date`/`startMin`; `end` = start + `max(durationMin,15)`; tint by tag (`study`, `personal`, `project`, otherwise neutral); `is-done`; `fromRange` of 15 min → 60 min; a normal `fromRange` keeps the duration and rounds to 5 min.

### T8.2 `WeekCalendar` + styles
- **Files:** `week-calendar.tsx` (client), `week-calendar.css`.
- **Config:** exactly [A§10] (`locale="en"`, `firstDay={1}`). `eventDrop`/`eventResize` → `update(id, fromRange(start, end))`; `eventClick` → `toggle(id)`; `select` → `setPendingRange` + `focus`; register in the provider an `onCreated` that calls `calendarRef.current.getApi().unselect()`.
- **Own header:** kicker "Better Tasks · week {n}", range title "Oct 12–18" (`text-[44px] font-semibold`), on the right the week's planned hours (`font-mono text-xs text-ash`, e.g. "21 h planned") + buttons ‹ / Today / › (`Button variant="outline"`, `lucide-react` icons `ChevronLeft/Right`, `aria-label` "Previous week" / "Next week"), which call `getApi().prev()/today()/next()`.
- **CSS (`week-calendar.css`, using `var(--color-*)`):** background `ground`; hour lines `#1F2420` and half-hour lines `#181B19` (the only hex exceptions allowed; add them as `--cal-line` and `--cal-line-half` at the top of the file); today's column with a 2.5% sodium tint; day header: lowercase name `text-ash`, 22 px semibold number, today in sodium with a sodium bottom border; hours `font-mono 11px ash-dim`; events `border-radius:9px; padding:6px 8px` with tints: `--ice` `rgb(141 184 255 / .13)` border `.28`, `--moss` `rgb(143 203 155 / .13)` border `.28`, `--bone` `rgb(236 230 216 / .08)` border `.20`, `--neutral` `raise` border `#2E332F`; `.is-done` opacity .5 + strikethrough; selection mirror `1.5px dashed sodium` border + 12% sodium background; now indicator sodium 1.5 px with a 9 px dot; newly created event `animation: pop`.
- **Acceptance (manual):** dragging a range shows the mirror and lights up QuickAdd with the range chip; typing "Study the Next.js course" + Enter creates the block (no tag → neutral tint; with `#study` → *ice* tint); dragging a block moves it; stretching its edge changes the duration; click marks it done.

### T8.3 Week page
- `week/page.tsx` → `<WeekCalendar />` (no `DayAside`).
- Width: the `AppShell` container uses `max-w-[1120px]`, except on `/week`, where it uses `max-w-[1360px]` (`AppShell` decides with `usePathname()`; no new props).
- The calendar's scroll area is `h-[640px]` and has `padding-bottom: 220px` so QuickAdd does not cover the last hour.

---

## Phase 9 — Wrap-up

### T9.1 Motion and contrast audit
- Go through every component: no animation outside the [A§8] table; no `transition-all`; hover only with the media query; with "reduce motion" on in the OS there are no displacements or pulse.
- Check the contrast of every text/background pair used (bone, ash, ash-dim, sodium-soft over ground/surface/raise) ≥ 4.5:1. `text-faint` is not used for text.

### T9.2 Cleanup
- Delete components in `src/components/ui/` with no importers (`grep`), unused `button` variants, and unused dependencies in `package.json` (check `next-themes`: it stays only if `sonner.tsx` still imports it; otherwise uninstall).
- `grep -rnE "#[0-9a-fA-F]{3,6}\b" src --include=*.tsx` → empty.
- `grep -rnP "[áéíóúñ¿¡]" src` → empty (no Spanish left in the app).

### T9.3 README
- Rewrite `README.md`: what it is, how to run (`npm i`, `npm run dev`, `npm test`), structure (link to `docs/ARCHITECTURE.md`), Line syntax, current limitations (in-memory, no auth). Remove links/features that do not exist.

### T9.4 Definition of done
- Meet [A§12] and the checks:
  ```bash
  grep -rn "@clerk\|supabase\|animate-ui\|CategoryProvider" src        # empty
  grep -rn "from \"react\"\|from \"next" src/features/tasks/domain     # empty
  grep -rln "@fullcalendar" src | grep -v "src/features/calendar/"      # empty
  npx tsc --noEmit && npm run lint && npm test && npm run build
  ```
