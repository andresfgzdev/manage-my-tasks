"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { THEME_KEY } from "./theme-script";

export type Theme = "dark" | "light";

const listeners = new Set<() => void>();

// The class on <html> is the source of truth; React only mirrors it.
const read = (): Theme =>
  document.documentElement.classList.contains("light") ? "light" : "dark";

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab switched: follow it, without the animation.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) apply(e.newValue === "light" ? "light" : "dark", false);
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function apply(theme: Theme, persist = true) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }
  listeners.forEach((listener) => listener());
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "dark");
}

const DURATION = 760;
const EASE = "cubic-bezier(0.77, 0, 0.175, 1)";

/**
 * Switches the theme with a view transition: the browser freezes the old theme
 * in a snapshot, and the new one grows out of `origin` as a circle until it
 * covers the farthest corner. The old one dims underneath as it is swallowed.
 */
export function switchTheme(origin: { x: number; y: number }) {
  const next: Theme = read() === "dark" ? "light" : "dark";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) {
    apply(next);
    return;
  }

  const root = document.documentElement;
  const { x, y } = origin;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  root.classList.add("theme-switching");
  // flushSync: the icon must already be the new one when the new snapshot is taken.
  const transition = document.startViewTransition(() => flushSync(() => apply(next)));

  void transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: DURATION, easing: EASE, pseudoElement: "::view-transition-new(root)" },
    );
    root.animate(
      { filter: ["brightness(1) saturate(1)", "brightness(0.55) saturate(0.6)"] },
      { duration: DURATION, easing: EASE, pseudoElement: "::view-transition-old(root)" },
    );
  });
  void transition.finished.finally(() => root.classList.remove("theme-switching"));
}
