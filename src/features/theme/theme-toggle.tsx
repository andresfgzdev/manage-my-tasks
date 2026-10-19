"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchTheme, useTheme } from "./theme";

const ICON =
  "absolute size-[17px] transition-[transform,opacity] duration-[420ms] ease-out-strong";

export function ThemeToggle() {
  const theme = useTheme();
  const light = theme === "light";
  const label = light ? "Switch to the night theme" : "Switch to the day theme";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        // The wave starts at the button, also when it is pressed from the keyboard.
        const rect = e.currentTarget.getBoundingClientRect();
        switchTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      className="press relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-raise text-ash transition-colors hover:border-faint hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
    >
      <Sun
        aria-hidden="true"
        className={cn(ICON, light ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")}
      />
      <Moon
        aria-hidden="true"
        className={cn(ICON, light ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")}
      />
    </button>
  );
}
