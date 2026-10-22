"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  count?: number;
  disabled?: boolean;
  // Called on hover/focus/touch to warm whatever the view needs.
  onWarm?(): void;
};

const ITEM = "inline-flex h-11 w-28 items-center justify-center text-sm";

export function LensTabs({ items, activeHref }: { items: Item[]; activeHref?: string }) {
  const pathname = usePathname();
  const active = activeHref ?? pathname;
  const activeIndex = items.findIndex((item) => !item.disabled && item.href === active);

  return (
    <nav aria-label="Views" className="relative flex overflow-x-auto border-b border-line">
      {items.map((item) =>
        item.disabled ? (
          <span key={item.href} aria-disabled="true" className={cn(ITEM, "cursor-not-allowed text-faint")}>
            {item.label}
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === active ? "page" : undefined}
            onPointerEnter={item.onWarm}
            onFocus={item.onWarm}
            onTouchStart={item.onWarm}
            className={cn(
              ITEM,
              "press text-ash transition-colors duration-200 hover:text-bone aria-[current=page]:text-bone",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 font-mono text-[11px] text-ash-dim">{item.count}</span>
            )}
          </Link>
        ),
      )}
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-28 bg-sodium transition-[transform,opacity] duration-[260ms] ease-in-out-strong",
          activeIndex < 0 && "opacity-0",
        )}
        style={{ transform: `translateX(${Math.max(activeIndex, 0) * 112}px)` }}
      />
    </nav>
  );
}
