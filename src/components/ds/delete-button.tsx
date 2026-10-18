"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DISARM_MS = 2800;

// Two quiet steps instead of a long press: the first click arms the button
// (the label slides open), the second one confirms. It disarms by itself.
export function DeleteButton({
  onConfirm,
  label = "Delete",
}: {
  onConfirm(): void;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const disarm = () => {
    clearTimeout(timer.current);
    setArmed(false);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      aria-label={armed ? `Confirm: ${label}` : label}
      title={armed ? "Click again to delete" : label}
      data-armed={armed}
      onClick={() => {
        if (armed) {
          disarm();
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), DISARM_MS);
      }}
      onBlur={disarm}
      onKeyDown={(e) => {
        if (e.key === "Escape" && armed) {
          e.stopPropagation();
          disarm();
        }
      }}
      className={cn(
        "relative grid h-11 select-none grid-cols-[auto_0fr] items-center rounded-control px-[13px] text-ash",
        "transition-[grid-template-columns,background-color,color,transform] duration-200 ease-out-strong",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/60",
        "[@media(hover:hover)]:hover:bg-raise [@media(hover:hover)]:hover:text-bone",
        "active:scale-[0.96] active:bg-raise",
        "data-[armed=true]:grid-cols-[auto_1fr] data-[armed=true]:bg-ember data-[armed=true]:text-ground",
        "data-[armed=true]:[@media(hover:hover)]:hover:bg-ember/90 data-[armed=true]:[@media(hover:hover)]:hover:text-ground",
      )}
    >
      <Trash2 className="size-[18px]" aria-hidden="true" />
      <span
        aria-hidden="true"
        className={cn(
          "min-w-0 overflow-hidden whitespace-nowrap text-[13px] font-semibold opacity-0 transition-opacity duration-150",
          armed && "opacity-100 delay-75",
        )}
      >
        <span className="pl-2">Delete?</span>
      </span>
    </button>
  );
}
