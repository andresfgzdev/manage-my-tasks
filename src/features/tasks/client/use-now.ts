"use client";

import { useSyncExternalStore } from "react";
import { minuteOfDay, toIsoDate } from "@/features/tasks/domain/time";

export type Now = {
  date: Date;
  /** Local "YYYY-MM-DD". */
  today: string;
  /** Minutes past local midnight. */
  minute: number;
};

// One clock for the whole page: a single timer on the minute boundary, and the
// same snapshot object for every reader during a minute.
const MINUTE = 60_000;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let snapshot: Now | null = null;

function read(): Now {
  const ms = Math.floor(Date.now() / MINUTE) * MINUTE;
  if (snapshot?.date.getTime() !== ms) {
    const date = new Date(ms);
    snapshot = { date, today: toIsoDate(date), minute: minuteOfDay(date) };
  }
  return snapshot;
}

function tick() {
  timer = setTimeout(() => {
    for (const listener of listeners) listener();
    tick();
  }, MINUTE - (Date.now() % MINUTE));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) tick();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearTimeout(timer);
  };
}

/**
 * The current minute. `null` on the server and during hydration, so components
 * that depend on the time render a placeholder first and never mismatch.
 */
export function useNow(): Now | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
