"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useNow } from "@/features/tasks/client/use-now";
import { FALLBACK_NOW, InboxView, NextView, TodayView, WeekView } from "./fragments";

const VIEWS = [
  { id: "today", name: "Today", text: "Your hours from top to bottom, with a marker at the current minute. What is done or past steps back." },
  { id: "next", name: "Next", text: "Everything after today, grouped by day, so tomorrow never surprises you." },
  { id: "inbox", name: "Inbox", text: "Tasks with no day yet. Right-click one to give it today, tomorrow or a priority." },
  { id: "week", name: "Week", text: "A calendar of five days. Drag across empty hours to make a block, drag it to move, pull its edge to resize." },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function Views() {
  const [state, setState] = useState<{ view: ViewId; dir: "next" | "prev" }>({ view: "today", dir: "next" });
  const { view, dir } = state;
  const nowMin = useNow()?.minute ?? FALLBACK_NOW.minute;
  const index = VIEWS.findIndex((v) => v.id === view);
  const current = VIEWS[index];
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const bar = useRef<HTMLSpanElement>(null);

  // Slide the indicator under the selected tab: one measurement per change, no loop.
  useLayoutEffect(() => {
    const place = () => {
      const tab = tabs.current[index];
      if (!tab || !bar.current) return;
      bar.current.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop + tab.offsetHeight - 8}px) scaleX(${tab.offsetWidth / 100})`;
      bar.current.dataset.ready = "true";
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [index]);

  const select = (id: ViewId, i: number) => {
    if (id === view) return;
    setState({ view: id, dir: i > index ? "next" : "prev" });
  };

  return (
    <div className="bt-views">
      <div className="bt-views__index" data-reveal>
        <h2 className="sr-only">Four views of your tasks</h2>
        <div className="bt-views__names" role="tablist" aria-label="Views">
          {VIEWS.map((v, i) => (
            <button
              key={v.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={v.id === view}
              aria-controls="view-stage"
              className="bt-views__name"
              onClick={() => select(v.id, i)}
            >
              {v.name}
            </button>
          ))}
          <span ref={bar} className="bt-views__bar" aria-hidden />
        </div>
        <p key={view} className="bt-views__text bt-swap" aria-live="polite">{current.text}</p>
      </div>
      <div className="bt-views__stage" data-reveal id="view-stage" role="tabpanel" aria-label={current.name}>
        <div key={view} className="bt-views__sheet" data-view={view} data-dir={dir}>
          {view === "today" && <TodayView nowMin={nowMin} />}
          {view === "next" && <NextView />}
          {view === "inbox" && <InboxView />}
          {view === "week" && <WeekView />}
        </div>
      </div>
    </div>
  );
}
