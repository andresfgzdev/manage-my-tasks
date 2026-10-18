"use client";

import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Built straight on the radix primitive: the shadcn Checkbox bakes in its own
// indicator, and the Tick draws its check mark with a stroke animation instead.
export function Tick({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange(checked: boolean): void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "group/tick grid size-[22px] shrink-0 cursor-pointer place-items-center rounded-[7px] border-[1.5px] border-faint bg-transparent p-0 transition-[background-color,border-color,transform] duration-[180ms] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/60 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-moss data-[state=checked]:bg-moss",
        className,
      )}
    >
      <svg viewBox="0 0 14 14" className="size-[63%]" fill="none" aria-hidden="true">
        <path
          d="M3 7.2l2.6 2.6L11 4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-ground stroke-[2.2] [stroke-dasharray:16] [stroke-dashoffset:16] transition-[stroke-dashoffset] delay-[60ms] duration-[220ms] ease-out-strong group-data-[state=checked]/tick:[stroke-dashoffset:0]"
        />
      </svg>
    </CheckboxPrimitive.Root>
  );
}
