"use client";

import { useEffect, useRef, useState } from "react";
import { describeDraft, placeLine } from "@/features/tasks/domain/line";
import { Chips, TaskPanel, WeekView } from "./fragments";

const STEPS = [
  {
    say: "First, write it the way you would say it.",
    more: "Time, length, priority, tags and day come out of the words. The time stays in the title, highlighted.",
  },
  {
    say: "Then drag it to where it fits.",
    more: "In Week, move the block to another hour or day, or pull its lower edge to make it longer.",
  },
  {
    say: "Open it when it needs more.",
    more: "Inline details hold steps you can tick and a note. The full edit dialog is one click away.",
  },
];

const LINE = "Call 11:00 to 12:30 #work,home tomorrow";
const TODAY = "2026-01-01";

function Stage({ step }: { step: number }) {
  if (step === 0) {
    const { line, draft } = placeLine(LINE, TODAY, { view: "today" });
    return (
      <div className="ui-win ui-compose" data-ui>
        <div className="ui-win__head">
          <strong>Add a task</strong>
          <span>Enter to save</span>
        </div>
        <div className="ui-line">
          <span className="ui-line__text">{LINE}</span>
          <span className="ui-caret" aria-hidden />
        </div>
        <Chips tokens={line.tokens} />
        <p className="ui-compose__out">
          Saves as <strong>{line.title}</strong>, {draft && describeDraft(draft, TODAY)}.
        </p>
      </div>
    );
  }
  if (step === 1) return <WeekView variant="drag" />;
  return <TaskPanel />;
}

export function How() {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="bt-how__body">
      <div className="bt-how__steps">
        <h2 className="bt-h2" data-reveal>From a line to a plan</h2>
        {STEPS.map((s, i) => (
          <div
            key={s.say}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={i}
            data-active={i === step ? "true" : undefined}
            className="bt-how__step"
            data-reveal
            data-stagger
          >
            <p className="bt-statement">{s.say}</p>
            <p className="bt-how__more">{s.more}</p>
            <div className="bt-how__inline">
              <Stage step={i} />
            </div>
          </div>
        ))}
      </div>
      <div className="bt-how__pin" aria-hidden>
        <div className="bt-how__stage">
          {STEPS.map((s, i) => (
            <div key={s.say} className="bt-how__frag" data-on={i === step ? "true" : undefined} data-side={i < step ? "past" : "future"}>
              <Stage step={i} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
