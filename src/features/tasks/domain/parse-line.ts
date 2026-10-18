import { addDays, formatDuration, formatHM } from "./time.ts";
import { MAX_TAGS, PRIORITY_NAMES, normalizeTag } from "./task.ts";
import type { Priority } from "./task.ts";

export type LineTokenKind = "time" | "duration" | "priority" | "tag" | "day";
export type LineToken = { kind: LineTokenKind; label: string };

/** The small word in front of a chip ("at 15:30", "lasts 45 min"), shared by the app and the landing. */
export const TOKEN_KIND_LABELS: Record<LineTokenKind, string> = {
  time: "at",
  duration: "lasts",
  priority: "priority",
  tag: "tag",
  day: "day",
};

export type ParsedLine = {
  title: string;
  date: string | null | undefined;
  startMin: number | null;
  durationMin: number;
  priority: Priority;
  tags: string[];
  tokens: LineToken[];
};

const TIME_24 = /^(\d{1,2}):(\d{2})$/;
const TIME_12 = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/i;
const DURATION = /^~(\d+)(m|h)$/i;
const PRIORITY = /^(!{1,3})$/;
// "#work", "#work,home" and "#work,#home" all yield separate tags.
const TAGS = /^#([\p{L}\d_-]{1,32}(?:,#?[\p{L}\d_-]{1,32})*),?$/u;
const DAY = /^(today|tomorrow)$/i;
const RANGE_WORDS = new Set(["to", "-", "–", "→", "until"]);
const RANGE_JOINED = /^([^-–→]+)[-–→]([^-–→]+)$/;
// A time word as typed, used to find mentions inside a title.
const TIME_WORD = /(?<![\w:])\d{1,2}(?::\d{2})?(?:am|pm)?(?![\w:])/gi;
const MERIDIEM = /(am|pm)$/i;

/** Minutes past midnight for "15:30", "3pm" or "3:30pm"; null when it is not a time. */
export function readTime(word: string): number | null {
  let match = word.match(TIME_24);
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    return h <= 23 && m <= 59 ? h * 60 + m : null;
  }
  match = word.match(TIME_12);
  if (match) {
    const h = Number(match[1]);
    const m = match[2] === undefined ? 0 : Number(match[2]);
    if (h < 1 || h > 12 || m > 59) return null;
    return (h % 12) * 60 + m + (match[3].toLowerCase() === "pm" ? 720 : 0);
  }
  return null;
}

/** Splits a title into plain text and time mentions, so the UI can highlight the latter. */
export function splitTimeMentions(title: string): { text: string; time: boolean }[] {
  const parts: { text: string; time: boolean }[] = [];
  let last = 0;
  for (const match of title.matchAll(TIME_WORD)) {
    if (readTime(match[0]) === null) continue;
    if (match.index > last) parts.push({ text: title.slice(last, match.index), time: false });
    parts.push({ text: match[0], time: true });
    last = match.index + match[0].length;
  }
  if (last < title.length) parts.push({ text: title.slice(last), time: false });
  return parts;
}

/** Title without the time mention at `index` (the n-th mention), with tidy spacing. */
export function removeTimeMention(title: string, index: number): string {
  let seen = -1;
  return splitTimeMentions(title)
    .filter((part) => !(part.time && ++seen === index))
    .map((part) => part.text)
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Length in minutes of an end time after a start, wrapping past midnight. */
function rangeLength(start: number, end: number): number {
  const length = (end - start + 1440) % 1440;
  return length === 0 ? 0 : length;
}

/** Start and end of "13:30 to 15:30"; the end's am/pm carries over to a bare start ("1:30-3pm"). */
function readRange(fromWord: string, toWord: string): { from: number; to: number } | null {
  const to = readTime(toWord);
  if (to === null) return null;
  let from = readTime(fromWord);
  const suffix = toWord.match(MERIDIEM)?.[1].toLowerCase();
  if (suffix && !MERIDIEM.test(fromWord)) {
    const same = readTime(fromWord + suffix);
    if (same !== null) {
      // "11-1pm" means 11am to 1pm: the other half of the day when the same one would end first.
      const other = readTime(fromWord + (suffix === "pm" ? "am" : "pm"));
      from = same <= to || other === null ? same : other;
    }
  }
  return from === null ? null : { from, to };
}

export function parseLine(text: string, today: string): ParsedLine {
  let startMin: number | null = null;
  let durationMin = 0;
  let rangeMin = 0;
  let priority: Priority = 0;
  const tags: string[] = [];
  let day: "today" | "tomorrow" | null = null;
  const tokens: LineToken[] = [];
  const rest: string[] = [];

  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let match: RegExpMatchArray | null;

    if (startMin === null) {
      // "13:30-15:30" as one word, "13:30 to 15:30" as three, or a lone time.
      // Times are kept in the title: the task shows them as a highlighted mention.
      const joined = word.match(RANGE_JOINED);
      const spaced = !joined && RANGE_WORDS.has(words[i + 1]?.toLowerCase() ?? "");
      const range = joined
        ? readRange(joined[1], joined[2])
        : spaced
          ? readRange(word, words[i + 2] ?? "")
          : null;
      if (range) {
        startMin = range.from;
        rangeMin = rangeLength(range.from, range.to);
        tokens.push({ kind: "time", label: formatHM(startMin) });
        if (joined) {
          rest.push(word);
        } else {
          // The end time and its joiner stay in the title too.
          rest.push(word, words[i + 1], words[i + 2]);
          i += 2;
        }
        continue;
      }
      const alone = readTime(word);
      if (alone !== null) {
        startMin = alone;
        tokens.push({ kind: "time", label: formatHM(startMin) });
        rest.push(word);
        continue;
      }
    }

    if (durationMin === 0 && (match = word.match(DURATION))) {
      const minutes = Number(match[1]) * (match[2].toLowerCase() === "h" ? 60 : 1);
      if (minutes >= 1 && minutes <= 1440) {
        durationMin = minutes;
        tokens.push({ kind: "duration", label: formatDuration(minutes) });
        continue;
      }
    }

    if (priority === 0 && (match = word.match(PRIORITY))) {
      priority = match[1].length as Priority;
      tokens.push({ kind: "priority", label: PRIORITY_NAMES[priority] });
      continue;
    }

    if ((match = word.match(TAGS))) {
      for (const raw of match[1].split(",")) {
        const tag = normalizeTag(raw);
        if (tag === null || tags.length >= MAX_TAGS || tags.includes(tag)) continue;
        tags.push(tag);
        tokens.push({ kind: "tag", label: `#${tag}` });
      }
      continue;
    }

    if (day === null && (match = word.match(DAY))) {
      day = match[1].toLowerCase() as "today" | "tomorrow";
      tokens.push({ kind: "day", label: day });
      continue;
    }

    rest.push(word);
  }

  // An explicit "~45m" wins over the length implied by a range.
  if (durationMin === 0 && rangeMin > 0) {
    durationMin = rangeMin;
    tokens.push({ kind: "duration", label: formatDuration(rangeMin) });
  }

  let date: string | null | undefined;
  if (day === "today") date = today;
  else if (day === "tomorrow") date = addDays(today, 1);
  else if (startMin !== null) date = today;

  const joined = rest.join(" ");
  const title = joined.charAt(0).toUpperCase() + joined.slice(1);

  return { title, date, startMin, durationMin, priority, tags, tokens };
}
