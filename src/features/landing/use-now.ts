"use client";

import { useEffect, useState } from "react";
import { dayTitle } from "@/features/tasks/domain/time";

/** The visitor's local time in minutes. Server and first paint use a fixed 10:40, then the real clock. */
export function useNow(): { min: number; label: string } {
  const [now, setNow] = useState({ min: 640, label: "Monday, Oct 12" });
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const title = dayTitle(d);
      setNow({ min: d.getHours() * 60 + d.getMinutes(), label: `${title.name}, ${title.num}` });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
