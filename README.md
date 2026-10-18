# Better Tasks

A calm, keyboard-first planner for your day. You type a task in one line (`Review PR 15:30 ~45m !! #work`) and it lands on a timeline with its time, duration, priority and tags already set.

## Views

- **Today**: the day spine, a vertical timeline of today's tasks with a now marker, plus the tasks dated today without a time ("Whenever"). The side panel shows the hourly workload and the remaining focus time.
- **Next**: what is coming after today.
- **Inbox**: tasks without a date.
- **Week**: a calendar. Drag across a range to create a block; drag a block to move it, or resize it to change how long it lasts.

Open any task to edit it as a sentence (day, time, duration, priority, tags), add steps and a note. Tick it to complete it, and use the two-step button to delete it.

## The Line

The Line is the floating input that creates tasks. Write the title and add any of these, in any order:

| Write | Means | Example |
|---|---|---|
| `15:30`, `3pm`, `3:30pm` | Starts at (the time stays in the title) | `Call mum 6pm` |
| `13:30 to 15:30`, `1pm-3pm` | A time range: sets the start and the duration | `Workshop 9:00 to 11:30` |
| `~45m`, `~2h` | Lasts | `Read ~2h` |
| `!`, `!!`, `!!!` | Priority: low, medium, high | `Pay rent !!!` |
| `#work`, `#work,home` | One or more tags (up to 8) | `Report #work` |
| `today`, `tomorrow` | The day (a time alone also means today) | `run tomorrow 7:05` |

A line with no day and no time goes to the Inbox.

## Running it

Requires Node.js 24 (the tests run the TypeScript sources directly with `node --test`).

```bash
npm i
npm run dev     # http://localhost:3000
npm test        # domain and server tests (node --test)
npm run lint
npm run build
```

## Structure

```
src/
  app/                 routes: landing, (app)/today|next|inbox|week, api/tasks
  components/ds/       design system primitives
  components/ui/       shadcn components adapted to the tokens
  features/tasks/      domain (pure logic), server (store, route logic), client (data hooks), components
  features/calendar/   the Week calendar (FullCalendar lives only here)
  features/landing/    the landing page
docs/
  ARCHITECTURE.md      modules, decisions, design tokens and motion
  SPEC.md              the V1 implementation plan
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui on Radix · TanStack Query · FullCalendar 7 · Temporal polyfill

## Current limitations

- **In-memory storage**: tasks live in the server's memory and are lost when it restarts. The `TaskStore` interface is where a database plugs in.
- **No authentication**: everyone is the same demo user. `src/lib/session.ts` is the entry point for real auth.
- Dark mode only, English only, no time zones, no recurring tasks, no notifications.

Made with ❤️ by [Andres Gallego](https://github.com/WalkerFGZ)
