"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Current time, refreshed on every `intervalMs` boundary (the minute by default).
 * Returns `null` on the server and during hydration, so components that depend
 * on the time render a skeleton first and never mismatch.
 */
export function useNow(intervalMs = 60_000): Date | null {
  const ms = useSyncExternalStore<number | null>(
    (onChange) => {
      let timer: ReturnType<typeof setTimeout>;
      const schedule = () => {
        timer = setTimeout(() => {
          onChange();
          schedule();
        }, intervalMs - (Date.now() % intervalMs));
      };
      schedule();
      return () => clearTimeout(timer);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
  return useMemo(() => (ms === null ? null : new Date(ms)), [ms]);
}
