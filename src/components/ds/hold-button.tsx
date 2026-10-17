"use client";

import { useEffect, useRef, useState } from "react";

export function HoldButton({
  onConfirm,
  label,
  holdMs = 700,
  children,
}: {
  onConfirm(): void;
  label: string;
  holdMs?: number;
  children: React.ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancel = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };

  const start = () => {
    if (holding) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      onConfirm();
    }, holdMs);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const isActivationKey = (key: string) => key === " " || key === "Enter";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-holding={holding}
      onPointerDown={(e) => e.button === 0 && start()}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (isActivationKey(e.key) && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => isActivationKey(e.key) && cancel()}
      onBlur={cancel}
      className="press relative grid size-11 select-none place-items-center overflow-hidden rounded-control text-ash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/60 data-[holding=true]:text-ground"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-ember"
        style={{
          clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: holding
            ? `clip-path ${holdMs}ms linear`
            : "clip-path 200ms var(--ease-out-strong)",
        }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
