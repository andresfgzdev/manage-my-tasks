"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const COARSE = "(pointer: coarse)";

function subscribeCoarse(onChange: () => void) {
  const query = window.matchMedia(COARSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on phones and tablets: a finger, not a mouse. False on the server. */
export function useIsTouch(): boolean {
  return useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE).matches,
    () => false,
  );
}

/**
 * How much of the bottom of the layout the on-screen keyboard covers, in px.
 * Android (with interactive-widget=resizes-content) shrinks the page itself and
 * this stays 0; iOS only shrinks the visual viewport, so fixed bars need the lift.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      // Small differences are browser chrome sliding, not a keyboard.
      setInset(covered > 80 ? Math.round(covered) : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
