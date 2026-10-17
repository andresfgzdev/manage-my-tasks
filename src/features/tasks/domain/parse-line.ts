import { addDays, formatDuration, formatHM } from "./time.ts";
import type { Priority } from "./task.ts";

export type LineTokenKind = "time" | "duration" | "priority" | "tag" | "day";
export type LineToken = { kind: LineTokenKind; label: string };

export type ParsedLine = {
  title: string;
  date: string | null | undefined;
  startMin: number | null;
  durationMin: number;
  priority: Priority;
  tag: string | null;
  tokens: LineToken[];
};

const TIME_24 = /^(\d{1,2}):(\d{2})$/;
const TIME_12 = /^(\d{1,2})(am|pm)$/i;
const DURATION = /^~(\d+)(m|h)$/i;
const PRIORITY = /^(!{1,3})$/;
const TAG = /^#([\p{L}\d_-]{1,32})$/u;
const DAY = /^(today|tomorrow)$/i;

const PRIORITY_LABELS = ["", "low", "medium", "high"];

export function parseLine(text: string, today: string): ParsedLine {
  let startMin: number | null = null;
  let durationMin = 0;
  let priority: Priority = 0;
  let tag: string | null = null;
  let day: "today" | "tomorrow" | null = null;
  const tokens: LineToken[] = [];
  const rest: string[] = [];

  for (const word of text.split(/\s+/).filter(Boolean)) {
    let match: RegExpMatchArray | null;

    if (startMin === null && (match = word.match(TIME_24))) {
      const h = Number(match[1]);
      const m = Number(match[2]);
      if (h <= 23 && m <= 59) {
        startMin = h * 60 + m;
        tokens.push({ kind: "time", label: formatHM(startMin) });
        continue;
      }
    }

    if (startMin === null && (match = word.match(TIME_12))) {
      const h = Number(match[1]);
      if (h >= 1 && h <= 12) {
        startMin = (h % 12) * 60 + (match[2].toLowerCase() === "pm" ? 720 : 0);
        tokens.push({ kind: "time", label: formatHM(startMin) });
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
      tokens.push({ kind: "priority", label: PRIORITY_LABELS[priority] });
      continue;
    }

    if (tag === null && (match = word.match(TAG))) {
      tag = match[1].toLowerCase();
      tokens.push({ kind: "tag", label: `#${tag}` });
      continue;
    }

    if (day === null && (match = word.match(DAY))) {
      day = match[1].toLowerCase() as "today" | "tomorrow";
      tokens.push({ kind: "day", label: day });
      continue;
    }

    rest.push(word);
  }

  let date: string | null | undefined;
  if (day === "today") date = today;
  else if (day === "tomorrow") date = addDays(today, 1);
  else if (startMin !== null) date = today;

  const joined = rest.join(" ");
  const title = joined.charAt(0).toUpperCase() + joined.slice(1);

  return { title, date, startMin, durationMin, priority, tag, tokens };
}
