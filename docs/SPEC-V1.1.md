# Better Tasks V1.1 — Persistence and accounts

> Execute this spec **in order**, one task at a time. It continues `docs/SPEC.md` (V1, phases 0–9, done) and uses the same reference: `docs/ARCHITECTURE.md`, cited as **[A§n]**.
> If a task cannot be fulfilled exactly as written, **stop and ask**. Do not improvise scope.
> **Language:** everything is English — code, docs, commits and all UI copy.

**Goal:** tasks survive restarts (MongoDB) and belong to a real account (Better Auth), deployed on Vercel. Nothing else changes: the domain, the views, the Line and the data client keep their behaviour.

---

## Global rules (apply to every task)

1. **Closed scope.** Only create or edit the files the task lists under *Files*. Still out: task sharing and any people UI, time zones, recurrence, notifications, light mode, i18n, UI/e2e tests [A§2.2].
2. **New dependencies, exactly these:** `mongodb@7.7.0` (T10.1) and `better-auth@1.7.10` (T11.1). Exact versions (`save-exact=true`). No Mongoose, no ORM, no `mongodb-memory-server`.
3. **The V1 rules still hold:** design tokens and primitives only (SPEC rule 3–4), no extra abstractions (rule 5), UI copy exactly as written here.
4. **Environment.** From T10.1 on, `npm run build` needs `MONGODB_URI` (Next imports the route modules while collecting page data). Keep a `.env.local` (git-ignored) with a local MongoDB or an Atlas database. `npm test` must pass **without** any variable: database tests skip themselves.
5. **Verification at the end of every task** (all must pass):
   ```bash
   npx tsc --noEmit && npm run lint && npm test && npm run build
   ```
6. **One commit per task**, message `feat(T<id>): <summary>` (or `chore`/`test`/`docs`). Do not push.
7. **Secrets** never enter the repo: only `.env.example` with empty values.

---

## Decisions

| ID | Decision | Why | Rejected |
|---|---|---|---|
| D13 | **MongoDB with the official `mongodb` driver**, one `tasks` collection; a task is one document (steps and note embedded, as in D4). `_id` is the task's UUID; `userId` is a field. A `$jsonSchema` validator guards the document's **shape** (types, enums, ranges); the domain keeps the rules. | The `Task` aggregate is already a document; the validator catches writes that bypass the domain without duplicating its rules. | Mongoose (second validation layer, heavier); Postgres + Drizzle (the user prefers MongoDB). |
| D19 | **`npm run db:setup` prepares a database**: the tasks validator and indexes, and the indexes Better Auth declares but does not create on MongoDB (unique `user.email` and `session.token`, `userId` lookups, TTL on expired sessions and verifications). Idempotent. | Better Auth's `unique`/`index` field flags only reach SQL through its CLI; without them MongoDB would accept two users with one email. | Creating them at request time (needs admin rights the app user should not have). |
| D14 | **Better Auth** with its MongoDB adapter, in the same database. Email + password always; GitHub when its two variables are set. Sessions in the database, cookie on the client. | Self-hosted, no vendor account, one database for everything; the official adapter needs no extra package. | Clerk (removed in V1, vendor lock-in); Auth.js (weaker email/password story). |
| D15 | **Identity stays behind `getCurrentUserId()`**, now `Promise<string \| null>`. The tasks module answers `unauthorized` when it is `null`; route handlers map it to **401**. | D6 already made this the only seam: the domain, the store and the client do not learn about auth. | Reading the session in each route handler. |
| D16 | **`proxy.ts` only does optimistic redirects** from the session cookie (no database call). Real protection is the 401 in the API. | Next 16 guidance: Proxy runs on every matched request, including prefetches, and must not be the authorization layer. | Session lookup in Proxy; auth checks in every page. |
| D17 | **The memory adapter stays**, for tests only. `default-tasks.ts` always uses MongoDB. | One code path in production; the memory adapter keeps the server tests fast and database-free. | A memory fallback when `MONGODB_URI` is missing (silently loses data). |
| D18 | **No transactions:** the auth adapter gets the `Db` only, not the client. | Works on a standalone local `mongod` as well as Atlas; sign-up writes are idempotent enough for a personal app. | Passing `client` (requires a replica set locally). |
| D20 | **Google is the only way in** (supersedes email + password and GitHub in D14 and T11.4): one "Continue with Google" button signs up and logs in, with `prompt: "select_account"`. | No passwords to store, reset or verify. | Email + password; GitHub. |
| D21 | **Verify the session before the app renders**, in the database: `(app)/layout.tsx` and `/login` call `getCurrentUser()`; the proxy no longer touches `/login` (a stale cookie would loop). `SessionGuard` and the API's 401 catch a session that ends while the app is open. | A revoked or expired session must never paint the app or its cached tasks. | Cookie-only checks. |
| D22 | **Harden the API and responses**: same-site, JSON-only, 64 KB writes; `no-store` on task responses; security headers on every response; one local task copy per account, all removed on sign out or an ended session; rate limit in the database. | CSRF in depth, clickjacking, shared devices, serverless rate limiting. | A full CSP (needs nonces for Next's inline scripts). |
| D23 | **The client names new tasks**: the draft carries a UUID `id` the server keeps (a retried create returns the existing task). | The optimistic row is the saved row: no remount, no second animation, no id mapping in `task-sync`. | Temporary ids swapped for server ids. |

---

## Phase 10 — Persistence (MongoDB)

### T10.1 Driver, connection and environment
- **Files:** `package.json`, `package-lock.json`, `src/lib/mongo.ts`, `.env.example`.
- `npm i mongodb@7.7.0`.
- `src/lib/mongo.ts` (`import "server-only"`):
  ```ts
  export function getMongoClient(): MongoClient; // one client per process, cached on globalThis (survives HMR and warm serverless invocations)
  export function getDb(): Db;                   // getMongoClient().db(process.env.MONGODB_DB || "better-tasks")
  ```
  The client is created on first call, never at import. If `MONGODB_URI` is missing, throw `new Error("MONGODB_URI is not set")`. `new MongoClient(uri)` does not connect until the first operation; do not call `connect()` by hand.
- `.env.example` (replace its content):
  ```bash
  # MongoDB: a local mongod or an Atlas connection string
  MONGODB_URI=
  MONGODB_DB=better-tasks
  # Only for the database tests (npm test); they skip when empty
  MONGODB_URI_TEST=
  ```
- **Do not:** connection pooling options, retries, logging.

### T10.2 A contract for every `TaskStore`
- **Files:** `src/features/tasks/server/task-store-contract.ts`, `src/features/tasks/server/task-store.test.ts`.
- `task-store-contract.ts` exports `storeContract(makeStore: () => Promise<{ store: TaskStore; cleanup(): Promise<void> }>, options?: { skip?: string })`: registers `node:test` cases that every adapter must pass:
  1. `list` of a user with nothing → `[]`.
  2. `put` then `get` → an equal task; `get` of a missing id → `null`.
  3. `put` with an existing id replaces the task.
  4. `list` orders by `createdAt` ascending.
  5. Users are isolated: another user's `get` → `null`, `list` does not include it, `remove` → `false` and the task survives.
  6. `remove` → `true` once, then `false`.
  7. Returned tasks are copies: mutating one does not change the stored task.
  8. A task with steps, tags, a note and `date: null` round-trips unchanged (deep equal).
- `task-store.test.ts` runs the contract against `createMemoryTaskStore()`.
- **Do not:** change `tasks.test.ts` in this task.

### T10.3 MongoDB adapter
- **Files:** `src/features/tasks/server/mongo-task-store.ts`, `src/features/tasks/server/mongo-task-store.test.ts`.
- No `server-only` import (it runs under `node --test`); it receives the collection, it does not read the environment.
  ```ts
  type TaskDoc = Omit<Task, "id"> & { _id: string; userId: string };
  export function createMongoTaskStore(collection: Collection<TaskDoc>): TaskStore;
  export function ensureTaskIndexes(collection: Collection<TaskDoc>): Promise<void>; // { userId: 1, createdAt: 1 }
  ```
  - `list`: `find({ userId })`, sort `{ createdAt: 1, _id: 1 }`, map to `Task`.
  - `get`: `findOne({ _id: id, userId })`.
  - `put`: `replaceOne({ _id: task.id, userId }, doc, { upsert: true })`.
  - `remove`: `deleteOne({ _id: id, userId })` → `deletedCount === 1`.
  - Mapping back drops `userId` and renames `_id` → `id`; the result has exactly the `Task` keys.
- `mongo-task-store.test.ts`: runs `storeContract` with a fresh collection per test (`tasks_test_<uuid>`) on `MONGODB_URI_TEST`, dropped in `cleanup`; closes the client in `after`. Without `MONGODB_URI_TEST`: `skip: "MONGODB_URI_TEST is not set"`.
- **Do not:** projections for partial reads.

### T10.4 Use MongoDB in the app
- **Files:** `src/features/tasks/server/default-tasks.ts`, `src/features/tasks/server/task-store.ts`.
- `default-tasks.ts`: `store: createMongoTaskStore(getDb().collection("tasks"))`. Indexes: call `ensureTaskIndexes` once per process (a module-level promise; a failure is logged with `console.error` and retried on the next call, never thrown at a request).
- `task-store.ts`: remove the `upgrade()` shim for the old `tag` field (it only existed for data kept alive by hot reloads) and the `globalThis.__tasksStore` comment that pointed at `default-tasks.ts`; `createMemoryTaskStore` stays for tests.
- Manual check: create a task, restart `npm run dev`, the task is still there.
- **Do not:** migrate data from memory (there is none to keep).

### T10.5 Validator and database setup
- **Files:** `src/features/tasks/server/mongo-task-store.ts`, `src/features/tasks/server/mongo-task-store.test.ts`, `scripts/db-setup.mts`, `package.json`, `README.md`.
- `mongo-task-store.ts`: export `taskValidator` (`$jsonSchema`: every `TaskDoc` key required, `additionalProperties: false`, `date` `YYYY-MM-DD` or null, `startMin` 0–1439 or null, `durationMin` 0–`MAX_DURATION`, `priority` 0–3, `tags` strings up to `MAX_TAGS`, steps `{ id, title, done }`) and `setUpTasksCollection(db, name = "tasks")`: creates the collection with the validator (or `collMod` on an existing one, `validationLevel: "strict"`, `validationAction: "error"`) plus `ensureTaskIndexes`.
- `mongo-task-store.test.ts`: the contract runs on collections made by `setUpTasksCollection` (so the validator must accept every valid task), plus one case that malformed documents are rejected.
- `scripts/db-setup.mts` + `"db:setup"` script (`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file-if-exists=.env.local scripts/db-setup.mts`): runs `setUpTasksCollection`, then creates the Better Auth indexes (D19), named `<model>_<fields>_uidx|idx|ttl` like Better Auth's own.
- **Do not:** validators on Better Auth's collections (its fields change with versions and plugins).

---

## Phase 11 — Accounts (Better Auth)

> Phase 13 replaces the email + password and GitHub sign-in of T11.1 and the form of T11.4 with Google only (D20), and T11.3's `/login` redirect with a real session check (D21).

### T11.1 Auth server and route
- **Files:** `package.json`, `package-lock.json`, `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/lib/auth-client.ts`, `.env.example`.
- `npm i better-auth@1.7.10`.
- `src/lib/auth.ts` (`import "server-only"`):
  ```ts
  import { betterAuth } from "better-auth";
  import { mongodbAdapter } from "better-auth/adapters/mongodb";
  import { nextCookies } from "better-auth/next-js";

  export const githubEnabled = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

  export const auth = betterAuth({
    database: mongodbAdapter(getDb()),               // D18: no client, no transactions
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders: githubEnabled ? { github: { clientId: …, clientSecret: … } } : {},
    plugins: [nextCookies()],                        // must stay the last plugin
  });
  ```
- `src/app/api/auth/[...all]/route.ts`: `export const { GET, POST } = toNextJsHandler(auth);`
- `src/lib/auth-client.ts` (client): `export const authClient = createAuthClient();` from `better-auth/react` (same origin, no `baseURL`).
- `.env.example`, append:
  ```bash
  # Better Auth: a random 32+ character secret (openssl rand -base64 32) and the app's URL
  BETTER_AUTH_SECRET=
  BETTER_AUTH_URL=http://localhost:3000
  # Optional: GitHub sign-in (callback: <BETTER_AUTH_URL>/api/auth/callback/github)
  GITHUB_CLIENT_ID=
  GITHUB_CLIENT_SECRET=
  ```
- **Do not:** email verification, password reset, 2FA, other providers, the Better Auth CLI or its generated schema (MongoDB needs none).

### T11.2 Identity in the tasks module and the API
- **Files:** `src/lib/session.ts`, `src/features/tasks/server/tasks.ts`, `src/features/tasks/server/tasks.test.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/features/tasks/client/tasks-api.ts`, `src/features/tasks/client/use-tasks.tsx`.
- `session.ts`: `getCurrentUserId(): Promise<string | null>` → `(await auth.api.getSession({ headers: await headers() }))?.user.id ?? null`. Update its comment.
- `tasks.ts`: `export const UNAUTHORIZED = "unauthorized"`; `userId: () => Promise<string | null>`; `list` becomes `Promise<Result<Task[]>>`; every method returns `{ ok: false, error: UNAUTHORIZED }` when the user is `null`, **before** validating input or touching the store.
- `tasks.test.ts`: add one case per method for a `null` user (the store is never called), and adapt `list` to the `Result`.
- Route handlers: `UNAUTHORIZED` → 401, `NOT_FOUND` → 404, other errors → 400; `GET /api/tasks` unwraps the `Result`.
- `tasks-api.ts`: owns `STORAGE_KEY` and `clearTasksCache()` (removes it from `localStorage`, inside `try/catch`), so `use-tasks.tsx` imports them without a cycle. On 401: `clearTasksCache()`, `authClient.signOut()` (drops a stale cookie, or the proxy of T11.3 would bounce `/login` back to the app), then `window.location.assign("/login?next=" + encodeURIComponent(location.pathname))`; the request still rejects.
- `use-tasks.tsx`: re-exports `clearTasksCache` (the client module's public entry), used by T11.5.
- Update the HTTP contract table in [A§5.3] (401 on every route).
- **Do not:** pass `userId` from the client (D6); role or permission checks.

### T11.3 Proxy
- **Files:** `src/proxy.ts`.
- Optimistic redirects only (D16), with `getSessionCookie(request)` from `better-auth/cookies`:
  - `/today`, `/next`, `/inbox`, `/week` without the cookie → `/login?next=<path>`.
  - `/login` with the cookie → `/today`.
- `export const config = { matcher: ["/today", "/next", "/inbox", "/week", "/login"] }`.
- **Do not:** database lookups, touching `/` (the landing stays public) or `/api/*`.

### T11.4 Log in page
- **Files:** `src/app/login/page.tsx`, `src/features/auth/components/login-form.tsx`, `src/features/landing/landing.tsx`.
- `page.tsx` (server): reads `next` from `searchParams`; accepts it only if it starts with `/` and not `//`, otherwise `/today`. Renders `<LoginForm next={next} githubEnabled={githubEnabled} />` centred on the ground, max width 380 px. `metadata.title = "Log in · Better Tasks"`.
- `login-form.tsx` (client), two modes on one form:
  - **Log in:** title `Log in to Better Tasks`; fields `Email`, `Password`; button `Log in`; link `New here? Create an account`.
  - **Create account:** title `Create your account`; fields `Name`, `Email`, `Password` (hint `At least 8 characters`); button `Create account`; link `Have an account? Log in`.
  - When `githubEnabled`: an outline button `Continue with GitHub` above the fields and a separator line with `or`.
  - Uses `authClient.signIn.email`, `authClient.signUp.email`, `authClient.signIn.social({ provider: "github", callbackURL: next })`. On success `router.replace(next)`.
  - Errors: one `role="alert"` line under the fields with the server's message, or `Something went wrong. Try again.`; the button shows `…` and is disabled while pending.
  - Inputs: `components/ui/input`, labels visible, correct `autocomplete` (`email`, `current-password` / `new-password`, `name`), the first field autofocused.
- `landing.tsx`: `LOGIN_HREF = "/login"`.
- **Do not:** a separate sign-up route, "remember me", password visibility toggle, illustrations.

### T11.5 Account button and sign out
- **Files:** `src/features/auth/components/account-button.tsx`, `src/features/tasks/components/app-shell.tsx`.
- `AccountButton` (client): `authClient.useSession()`; a 36 px round `press` button with the first letter of the user's name (`aria-label="Account"`); on click it opens `useAppMenu` anchored to itself with a `heading` item (name, email as detail), a separator and `Sign out` (icon `LogOut`).
- Sign out: `authClient.signOut()`, then `clearTasksCache()`, then `window.location.assign("/")`: a full load, so the React Query cache goes with the page.
- `AppShell`: render `AccountButton` at the right end of the `LensTabs` row (a `flex items-end justify-between` wrapper; the tabs in a `min-w-0 flex-1` box so their underline reaches the button); nothing else in the shell changes.
- **Do not:** a profile page, avatars from GitHub, account settings.

---

## Phase 13 — Google only and hardening

### T13.1 Google-only log in
- **Files:** `src/lib/auth.ts`, `src/app/login/page.tsx`, `src/features/auth/components/login-form.tsx`, `.env.example`.
- `auth.ts`: no `emailAndPassword`; `socialProviders.google` with `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (missing → throw `<NAME> is not set`) and `prompt: "select_account"`; `session: { expiresIn: 7 days, updateAge: 1 day }`; `rateLimit: { storage: "database" }`.
- `login-form.tsx`: title `Log in to Better Tasks`; text `Use your Google account. The first time, it creates your Better Tasks account.`; button `Continue with Google` (pending: `Opening Google…`, re-enabled on `pageshow` from the back/forward cache); footnote `Better Tasks only reads your name and email.` `signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/login?next=<next>" })`.
- `page.tsx`: a notice from the query — `error=access_denied` → `Google sign-in was cancelled.`; any other `error` → `Google sign-in didn't work. Try again.`; `reason=expired` → `Your session ended. Log in again to continue.`

### T13.2 Safe `next`
- **Files:** `src/features/auth/safe-next.ts`, `safe-next.test.ts`.
- `safeNext(next: unknown): string`: a same-site path (path, query, hash) or `/today`. Rejects non-strings, `//…`, any `\`, control characters, absolute URLs. Tests cover each.

### T13.3 Verified session before render
- **Files:** `src/lib/session.ts`, `src/app/(app)/layout.tsx`, `src/app/login/page.tsx`, `src/proxy.ts`, `src/features/auth/components/session-guard.tsx`, `src/features/auth/components/account-button.tsx`, `src/features/tasks/components/app-shell.tsx`.
- `session.ts`: `getCurrentUser()` (`{ id, name, email }` or null, wrapped in React `cache`); `getCurrentUserId()` reads it.
- `(app)/layout.tsx`: `async`; no user → `redirect("/login?reason=expired")`; passes `userId` to `TasksProvider` and `{ name, email }` to `AppShell` → `AccountButton` (no client session fetch).
- `/login`: a signed-in visitor is redirected to `next`.
- `proxy.ts`: matcher only the four app routes; no cookie → `/login?next=<path+query>`.
- `SessionGuard` (in the app layout): `authClient.getSession()` on `visibilitychange` to visible and every 5 minutes while visible; no session (and no network error) → `endSession()`.

### T13.4 Local copy per account
- **Files:** `src/features/tasks/client/tasks-api.ts`, `src/features/tasks/client/use-tasks.tsx`.
- `storageKey(userId)` = `better-tasks:tasks:v3:<userId>`; `clearTasksCache()` removes every `better-tasks:tasks:` key; `endSession()` clears them and does a full load to `/login?reason=expired&next=<path+query>`; a 401 calls `endSession()`. `TasksProvider` takes `userId`. `use-tasks.tsx` re-exports `clearTasksCache` and `endSession`.

### T13.5 API guards and headers
- **Files:** `src/features/tasks/server/http.ts`, `http.test.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `next.config.ts`, `scripts/db-setup.mts`.
- `http.ts`: `isSameSite(req)`: `Sec-Fetch-Site` must be `same-origin`; without it, an `Origin` host must equal `X-Forwarded-Host`/`Host` (never `req.url`, whose host is the server's). `readJsonBody(req)` → 403 `forbidden` when not same-site; 415 unless `application/json`; 413 over 64 KB; malformed JSON → `null` (the domain answers 400). `isSameSite(req)` for DELETE. `statusFor(error)` and `PRIVATE` (`Cache-Control: private, no-store`) for every task response.
- `next.config.ts`: `poweredByHeader: false`; on `/:path*`: `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`.
- `db-setup.mts`: unique `rateLimit.key` (`rateLimit_key_uidx`).

### T13.6 No flicker, one navigation
- **Files:** `src/features/tasks/domain/task.ts` (+ test), `src/features/tasks/server/tasks.ts` (+ test), `src/features/tasks/client/task-sync.ts` (+ test), `src/features/tasks/client/use-tasks.tsx`, `src/features/tasks/components/task-row.tsx`, `src/features/tasks/components/app-shell.tsx`, `src/features/auth/components/account-button.tsx`, `src/lib/session.ts`, `src/app/(app)/layout.tsx`, `src/proxy.ts`.
- Drafts accept an `id` (UUID, lower-cased; patches never do). `tasks.create` uses it, or a new one; if the user already has that id, it returns that task. `task-sync` creates with `newId()` as the final id: no temporary prefix, no `realIds`/`createdAs`, no `isUnsaved`. `TaskRow` always animates its entry (it mounts once).
- `AppShell`: the content wrapper loses `animate-rise` (the template's `animate-view-in` is the view's one entrance); the tabs row centres the account button.
- `AccountButton`: the Google photo (`next/image`, `unoptimized`, `referrerPolicy="no-referrer"`, falls back to the initial); sign out = `signOut()`, `clearTasksCache()`, `router.replace("/")` to the landing (leaving the app layout drops the in-memory cache; no full reload).
- `proxy.ts`: matcher `{ source: "/(today|next|inbox|week)", missing: [next-router-prefetch, purpose=prefetch] }`.

---

## Phase 12 — Docs and deploy

### T12.1 Documentation
- **Files:** `docs/ARCHITECTURE.md`, `README.md`.
- ARCHITECTURE: add D13–D18 to [A§4]; in [A§2] move "real authentication" and "database" from *Out* to *In*; module map [A§5.1] with the Mongo adapter, `lib/auth.ts` and `proxy.ts`; `features/auth` in the file system [A§6] and the dependency rule (`features/auth` imports `lib/auth-client` and `components/*` only; `AppShell` may import `AccountButton`); remove the "in-memory store is lost" risk and add "Better Auth 1.7.10 is three days old at pinning time → go down a patch if a blocking bug appears".
- README: *Running it* gains the environment setup (copy `.env.example` to `.env.local`, MongoDB options); *Current limitations* drops in-memory and no-auth.

### T12.2 Deploy to Vercel (needs the owner)
There is **one environment**: the Atlas database in `.env.local` is production too. These steps need accounts and secrets, so the owner runs them; the implementer prepares and verifies.
1. MongoDB Atlas: network access for Vercel (`0.0.0.0/0`); ideally a second database user with only `readWrite` for the app, keeping the admin user for `npm run db:setup` (already run).
2. Google Cloud Console, same OAuth client: add `https://<domain>` to the JavaScript origins and `https://<domain>/api/auth/callback/google` to the redirect URIs; publish the app (Audience → Publish) so any Google account can sign in.
3. Vercel: import the repo; set `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (as in `.env.local`) and `BETTER_AUTH_URL=https://<domain>`.
4. Deploy, then check: sign in with Google, add a task, sign out, sign back in, the task is there; a second Google account does not see it; `/today` signed out redirects to `/login`; `GET /api/tasks` signed out → 401.

### T12.3 Definition of done
```bash
grep -rn "demo-user" src                                            # empty
grep -rn "from \"mongodb\"" src | grep -v "src/lib/mongo.ts\|server/mongo-task-store" # empty
grep -rln "better-auth\|auth-client" src | grep -v "src/lib/auth\|src/lib/session\|src/app/api/auth\|src/proxy.ts\|src/features/auth" # empty
grep -rn "emailAndPassword\|GITHUB_" src .env.example                # empty
npx tsc --noEmit && npm run lint && npm test && npm run build
MONGODB_URI_TEST=… npm test                                         # the Mongo contract runs and passes
```
