"use client";

import { useEffect } from "react";
import { useNow } from "@/features/tasks/client/use-now";
import { formatHM } from "@/features/tasks/domain/time";
import { FALLBACK_NOW } from "./fragments";

/** Marks the page as scripted and reveals [data-reveal] blocks once as they enter. Never leaves content hidden. */
export function Reveal() {
  useEffect(() => {
    const root = document.querySelector(".bt");
    if (!root) return;
    root.classList.add("js");
    const targets = root.querySelectorAll("[data-reveal], [data-stagger]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    targets.forEach((el) => io.observe(el));
    const safety = window.setTimeout(() => targets.forEach((el) => el.classList.add("is-in")), 4000);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);
  return null;
}

/** The visitor's own time, for the footer. */
export function LocalTime() {
  const minute = useNow()?.minute ?? FALLBACK_NOW.minute;
  const left = 24 * 60 - minute;
  return (
    <>
      <span className="bt-tile__big">
        <span key={minute} className="bt-roll">{formatHM(minute)}</span>
      </span>
      <span>
        on your clock. Today has {Math.floor(left / 60)} h {left % 60} min left.
      </span>
    </>
  );
}
