const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(iso: string, n: number): string {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + n);
  return formatUtc(date);
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatHM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function formatDuration(min: number): string {
  if (min <= 0) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

export function dayTitle(d: Date): { name: string; num: string } {
  return { name: DAYS[d.getDay()], num: `${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

export function shiftOf(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 19) return "afternoon";
  return "evening";
}

export function weekRange(today: string): { from: string; to: string } {
  const sinceMonday = (parseIso(today).getUTCDay() + 6) % 7;
  const from = addDays(today, -sinceMonday);
  return { from, to: addDays(from, 6) };
}

/** ISO 8601 week number (weeks start on Monday; week 1 holds the first Thursday). */
export function isoWeek(iso: string): number {
  const date = parseIso(iso);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const diffDays = (thursday.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diffDays - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** "13:30 → 15:30" for a start and a length; just the start when there is no length. */
export function formatRange(startMin: number, durationMin: number): string {
  return durationMin > 0
    ? `${formatHM(startMin)} → ${formatHM((startMin + durationMin) % 1440)}`
    : formatHM(startMin);
}
