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

Requires Node.js 24 (the tests run the TypeScript sources directly with `node --test`), a MongoDB database (Atlas) and a Google OAuth client. There is one environment: local development uses the production database.

1. Copy `.env.example` to `.env.local` and fill it in:
   - `MONGODB_URI` and `MONGODB_DB`: the Atlas connection string and database name.
   - `BETTER_AUTH_SECRET`: a random secret, e.g. `openssl rand -base64 32`. Vercel can have its own; changing a secret signs out everyone using that URL.
   - `BETTER_AUTH_URL`: `http://localhost:3000` locally, `https://<domain>` in Vercel.
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: a Google Cloud OAuth client (Web application) whose redirect URIs include `<BETTER_AUTH_URL>/api/auth/callback/google` for each URL above.
2. Prepare the database once (the tasks validator and every index; safe to run again):

```bash
npm run db:setup
```

3. Run it:

```bash
npm i
npm run dev     # http://localhost:3000, then Continue with Google at /login
npm test        # domain and server tests (node --test); the MongoDB ones skip without MONGODB_URI_TEST
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/better-tasks-test npm test   # also runs the store contract on a local, throwaway MongoDB (never the real one: it creates and drops collections)
npm run lint
npm run build   # needs the variables above (Next loads the route modules while building)
```

## Structure

```
src/
  app/                 routes: landing, (app)/today|next|inbox|week, api/tasks
  components/ds/       design system primitives
  components/ui/       shadcn components adapted to the tokens
  features/tasks/      domain (pure logic), server (MongoDB store, route logic), client (data hooks), components
  features/auth/       Google log in, account button, session guard, safe ?next=
  lib/                 MongoDB client, Better Auth (server and client), the session
  proxy.ts             sends signed-out visitors to /login
scripts/
  db-setup.mts         the tasks validator and the indexes (npm run db:setup)
  features/calendar/   the Week calendar (FullCalendar lives only here)
  features/landing/    the landing page
docs/
  ARCHITECTURE.md      modules, decisions, design tokens and motion
  SPEC.md              the V1 implementation plan
  SPEC-V1.1.md         persistence and accounts
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui on Radix · TanStack Query · FullCalendar 7 · Temporal polyfill · MongoDB · Better Auth

## Current limitations

- Google is the only way to sign in.
- Dark mode only, English only, no time zones, no recurring tasks, no notifications.

Made with ❤️ by [Andres Gallego](https://github.com/WalkerFGZ)
