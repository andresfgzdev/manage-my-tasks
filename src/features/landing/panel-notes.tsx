"use client";

import { useState } from "react";
import { TaskPanel } from "./fragments";

/* Notes sit level with the part of the panel they explain (offsets match the part heights). */
const NOTES = [
  { k: "title", side: "r", top: 20, name: "Times stay in the words", text: "Write 15:30 or 3pm and it is read as the start, then kept in the title, highlighted." },
  { k: "time", side: "l", top: 150, name: "Length from ~45m or a range", text: "Add ~45m or ~2h, or write 13:30 to 15:30 and the length comes from the range." },
  { k: "priority", side: "r", top: 220, name: "Priority by exclamation", text: "One mark is low, two is medium, three is high. The marks leave the title." },
  { k: "tags", side: "l", top: 300, name: "Several tags at once", text: "Write #work,home for two tags in one word. Up to eight on a task." },
  { k: "steps", side: "r", top: 380, name: "Steps you can tick", text: "Break a task into steps inside its details. The count shows on the row." },
  { k: "note", side: "l", top: 560, name: "A note for the rest", text: "Links, context, the thing you will forget by Monday. It stays with the task." },
] as const;

export function PanelNotes() {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <div className="bt-plate">
      <h2 className="bt-h2 bt-plate__head" data-reveal>Inside one task</h2>
      <div className="bt-plate__panel" data-reveal>
        <TaskPanel focus={focus} />
      </div>
      <ul className="bt-plate__notes">
        {NOTES.map((n) => (
          <li
            key={n.k}
            className="bt-note"
            data-side={n.side}
            style={{ "--top": `${n.top}px` } as React.CSSProperties}
            tabIndex={0}
            onMouseEnter={() => setFocus(n.k)}
            onMouseLeave={() => setFocus(null)}
            onFocus={() => setFocus(n.k)}
            onBlur={() => setFocus(null)}
            data-reveal
          >
            <strong>{n.name}</strong>
            <span>{n.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
