export type Priority = 0 | 1 | 2 | 3;
export type Step = { id: string; title: string; done: boolean };

export type Task = {
  id: string;
  title: string;
  date: string | null;
  startMin: number | null;
  durationMin: number;
  priority: Priority;
  tag: string | null;
  done: boolean;
  steps: Step[];
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskDraft = { title: string } & Partial<
  Pick<Task, "date" | "startMin" | "durationMin" | "priority" | "tag" | "note">
>;
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_TITLE = 200;
const MAX_NOTE = 5000;
const MAX_STEPS = 50;
const TAG_PATTERN = /^[\p{L}\d_-]{1,32}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DRAFT_KEYS = ["title", "date", "startMin", "durationMin", "priority", "tag", "note"];
const PATCH_KEYS = [...DRAFT_KEYS, "done", "steps"];

const fail = <T>(error: string): Result<T> => ({ ok: false, error });

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

function isRealDate(v: string): boolean {
  if (!DATE_PATTERN.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function validateTitle(v: unknown): Result<string> {
  if (typeof v !== "string" || v.trim() === "") return fail("Title is required");
  const title = v.trim();
  if (title.length > MAX_TITLE) return fail(`Title is too long (max ${MAX_TITLE})`);
  return { ok: true, value: title };
}

function validateSteps(v: unknown): Result<Step[]> {
  if (!Array.isArray(v)) return fail("Steps must be a list");
  if (v.length > MAX_STEPS) return fail(`Too many steps (max ${MAX_STEPS})`);
  const steps: Step[] = [];
  for (const item of v) {
    if (!isRecord(item) || typeof item.id !== "string" || item.id === "") {
      return fail("Invalid step");
    }
    const title = validateTitle(item.title);
    if (!title.ok) return fail("Step title is required");
    if (typeof item.done !== "boolean") return fail("Invalid step");
    steps.push({ id: item.id, title: title.value, done: item.done });
  }
  return { ok: true, value: steps };
}

const fieldValidators: Record<string, (v: unknown) => Result<unknown>> = {
  title: validateTitle,
  date: (v) => {
    if (v === null) return { ok: true, value: null };
    if (typeof v !== "string" || !isRealDate(v)) return fail("Invalid date");
    return { ok: true, value: v };
  },
  startMin: (v) => {
    if (v === null) return { ok: true, value: null };
    if (!isInt(v, 0, 1439)) return fail("Invalid start time");
    return { ok: true, value: v };
  },
  durationMin: (v) =>
    isInt(v, 0, 1440) ? { ok: true, value: v } : fail("Invalid duration"),
  priority: (v) =>
    isInt(v, 0, 3) ? { ok: true, value: v } : fail("Invalid priority"),
  tag: (v) => {
    if (v === null) return { ok: true, value: null };
    if (typeof v !== "string") return fail("Invalid tag");
    const tag = v.toLowerCase();
    return TAG_PATTERN.test(tag) ? { ok: true, value: tag } : fail("Invalid tag");
  },
  done: (v) => (typeof v === "boolean" ? { ok: true, value: v } : fail("Invalid done flag")),
  steps: validateSteps,
  note: (v) => {
    if (typeof v !== "string") return fail("Invalid note");
    return v.length > MAX_NOTE
      ? fail(`Note is too long (max ${MAX_NOTE})`)
      : { ok: true, value: v };
  },
};

function validateFields(input: unknown, allowed: string[]): Result<Record<string, unknown>> {
  if (!isRecord(input)) return fail("Invalid body");
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) return fail(`Unknown field: ${key}`);
    const checked = fieldValidators[key](input[key]);
    if (!checked.ok) return checked;
    out[key] = checked.value;
  }
  return { ok: true, value: out };
}

export function validateDraft(input: unknown): Result<TaskDraft> {
  const fields = validateFields(input, DRAFT_KEYS);
  if (!fields.ok) return fields;
  if (!("title" in fields.value)) return fail("Title is required");
  if (fields.value.startMin != null && fields.value.date == null) {
    return fail("A start time requires a date");
  }
  return { ok: true, value: fields.value as TaskDraft };
}

export function validatePatch(input: unknown): Result<TaskPatch> {
  const fields = validateFields(input, PATCH_KEYS);
  if (!fields.ok) return fields;
  if (fields.value.startMin != null && fields.value.date === null) {
    return fail("A start time requires a date");
  }
  return { ok: true, value: fields.value as TaskPatch };
}

export function applyPatch(task: Task, patch: TaskPatch, nowIso: string): Result<Task> {
  const checked = validatePatch(patch);
  if (!checked.ok) return checked;
  const next: Task = { ...task, ...checked.value, updatedAt: nowIso };
  if (next.startMin !== null && next.date === null) {
    return fail("A start time requires a date");
  }
  return { ok: true, value: next };
}
