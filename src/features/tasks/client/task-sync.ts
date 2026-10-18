import { applyPatch, newTask } from "../domain/task.ts";
import type { Task, TaskDraft, TaskPatch } from "../domain/task.ts";

// Framework-free core of the client module: optimistic writes, their order, and
// how they meet the server's answers. `use-tasks.tsx` plugs it into React Query.

/** What the sync needs from the network: `tasks-api.ts` in the app, a fake in tests. */
export type TasksAdapter = {
  list(): Promise<Task[]>;
  create(draft: TaskDraft): Promise<Task>;
  update(id: string, patch: TaskPatch): Promise<Task>;
  remove(id: string): Promise<void>;
};

export type TaskSync = {
  /** Fetches the list and returns it with the pending local writes on top. */
  load(): Promise<Task[]>;
  /** Paints a stale list (from storage) until the first load answers. */
  seed(tasks: Task[]): void;
  /** The last list the server confirmed: what is safe to keep in storage. */
  confirmed(): Task[] | null;
  /** `saved` resolves to false when the server refuses the task (it leaves the list). */
  create(draft: TaskDraft): { id: string; saved: Promise<boolean> };
  update(id: string, patch: TaskPatch): void;
  toggle(id: string): void;
  duplicate(id: string): void;
  remove(id: string): void;
  /** Resolves once every queued write has settled. */
  settled(): Promise<void>;
};

type Op =
  | { n: number; kind: "create"; id: string; draft: TaskDraft; at: string }
  | { n: number; kind: "update"; id: string; patch: TaskPatch; at: string }
  | { n: number; kind: "remove"; id: string };

const TEMP_PREFIX = "tmp-";

/** True for a task the server has not confirmed yet. */
export function isUnsaved(task: Pick<Task, "id">): boolean {
  return task.id.startsWith(TEMP_PREFIX);
}

function upsert(list: Task[], task: Task): Task[] {
  return list.some((t) => t.id === task.id)
    ? list.map((t) => (t.id === task.id ? task : t))
    : [...list, task];
}

function apply(list: Task[], op: Op): Task[] {
  switch (op.kind) {
    case "create":
      return [...list, newTask(op.draft, op.id, op.at)];
    case "update":
      return list.map((t) => {
        if (t.id !== op.id) return t;
        const next = applyPatch(t, op.patch, op.at);
        return next.ok ? next.value : t;
      });
    case "remove":
      return list.filter((t) => t.id !== op.id);
  }
}

export function createTaskSync(deps: {
  api: TasksAdapter;
  /** Receives the list to show after every change. */
  publish(tasks: Task[]): void;
  now?: () => Date;
  newId?: () => string;
}): TaskSync {
  const { api } = deps;
  const nowIso = () => (deps.now?.() ?? new Date()).toISOString();
  const newId = deps.newId ?? (() => crypto.randomUUID());

  // The visible list is always `base` (server truth) with `ops` (pending writes) replayed on top,
  // so a late server answer or a refetch can never wipe out a newer local edit.
  let base: Task[] | null = null;
  let ops: Op[] = [];
  let seq = 0;

  // Temporary ids map to the real ones once created; writes made meanwhile follow them.
  const realIds = new Map<string, string>();
  const createdAs = new Map<string, string>();
  const chains = new Map<string, Promise<void>>();

  // Writes confirmed while a list request is in flight are newer than that list.
  let epoch = 0;
  let loading = 0;
  let journal: { epoch: number; id: string; task: Task | null }[] = [];

  const view = () => ops.reduce(apply, base ?? []);
  const publish = () => deps.publish(view());
  const resolve = (id: string) => realIds.get(id) ?? id;
  const live = (n: number) => ops.find((o) => o.n === n);
  const drop = (n: number) => {
    ops = ops.filter((o) => o.n !== n);
  };

  function confirm(id: string, task: Task | null) {
    epoch += 1;
    base = task ? upsert(base ?? [], task) : (base ?? []).filter((t) => t.id !== id);
    if (loading > 0) journal.push({ epoch, id, task });
  }

  // Writes to one task run one after another: the server sees them in order and
  // their answers never overtake each other.
  function enqueue(id: string, step: () => Promise<void>) {
    const key = createdAs.get(id) ?? id;
    const next = (chains.get(key) ?? Promise.resolve()).then(step);
    chains.set(key, next);
    void next.finally(() => {
      if (chains.get(key) === next) chains.delete(key);
    });
  }

  async function load(): Promise<Task[]> {
    const started = epoch;
    loading += 1;
    try {
      const list = await api.list();
      base = journal
        .filter((entry) => entry.epoch > started)
        .reduce((acc, e) => (e.task ? upsert(acc, e.task) : acc.filter((t) => t.id !== e.id)), list);
      return view();
    } finally {
      loading -= 1;
      if (loading === 0) journal = [];
    }
  }

  // After a refused write, the server's list is the truth again.
  function resync() {
    load().then(deps.publish, () => {});
  }

  function update(id: string, patch: TaskPatch) {
    const target = resolve(id);
    const at = nowIso();
    const current = view().find((t) => t.id === target);
    // Nothing to edit, or an edit the server would refuse anyway.
    if (!current || !applyPatch(current, patch, at).ok) return;

    const n = ++seq;
    ops.push({ n, kind: "update", id: target, patch, at });
    publish();
    enqueue(target, async () => {
      const op = live(n);
      if (!op) return; // its task was never created
      try {
        const task = await api.update(op.id, patch);
        confirm(task.id, task);
        drop(n);
      } catch {
        drop(n);
        resync();
      }
      publish();
    });
  }

  function create(draft: TaskDraft) {
    const id = `${TEMP_PREFIX}${newId()}`;
    const n = ++seq;
    ops.push({ n, kind: "create", id, draft, at: nowIso() });
    publish();

    const saved = new Promise<boolean>((done) => {
      enqueue(id, async () => {
        try {
          const task = await api.create(draft);
          realIds.set(id, task.id);
          createdAs.set(task.id, id);
          confirm(task.id, task);
          drop(n);
          ops = ops.map((o) => (o.id === id ? { ...o, id: task.id } : o));
          done(true);
        } catch {
          ops = ops.filter((o) => o.id !== id);
          done(false);
          resync();
        }
        publish();
      });
    });
    return { id, saved };
  }

  return {
    load,
    confirmed: () => base,

    seed(tasks) {
      if (base !== null) return;
      base = tasks;
      publish();
    },

    create,
    update,

    toggle(id) {
      const task = view().find((t) => t.id === resolve(id));
      if (task) update(id, { done: !task.done });
    },

    duplicate(id) {
      const task = view().find((t) => t.id === resolve(id));
      if (!task) return;
      const { title, date, startMin, durationMin, priority, tags, note, steps } = task;
      const copy = create({ title, date, startMin, durationMin, priority, tags: [...tags], note });
      if (steps.length > 0) {
        update(copy.id, { steps: steps.map((s) => ({ ...s, id: newId() })) });
      }
    },

    remove(id) {
      const target = resolve(id);
      if (!view().some((t) => t.id === target)) return;
      const n = ++seq;
      ops.push({ n, kind: "remove", id: target });
      publish();
      enqueue(target, async () => {
        const op = live(n);
        if (!op) return;
        try {
          await api.remove(op.id);
          confirm(op.id, null);
          drop(n);
        } catch {
          // The task comes back; the resync settles whether it still exists.
          drop(n);
          resync();
        }
        publish();
      });
    },

    async settled() {
      while (chains.size > 0) await Promise.all([...chains.values()]);
    },
  };
}
