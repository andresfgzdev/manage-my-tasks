"use client";

import { usePathname } from "next/navigation";
import { LensTabs } from "@/components/ds/lens-tabs";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/tasks/client/use-now";
import { useTasks } from "@/features/tasks/client/use-tasks";
import { lensCounts } from "@/features/tasks/domain/spine";
import { toIsoDate } from "@/features/tasks/domain/time";
import { DayHeader } from "./day-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const now = useNow();
  const { tasks } = useTasks();
  const counts = now ? lensCounts(tasks, toIsoDate(now)) : null;
  const isWeek = pathname === "/week";

  return (
    <div className="min-h-dvh px-6 pt-10 max-sm:px-4">
      <div
        className={cn(
          "mx-auto flex flex-col gap-7",
          isWeek ? "max-w-[1360px]" : "max-w-[1120px]",
        )}
      >
        {!isWeek && <DayHeader />}
        <LensTabs
          items={[
            { href: "/today", label: "Today", count: counts?.today },
            { href: "/next", label: "Next", count: counts?.next },
            { href: "/inbox", label: "Inbox", count: counts?.inbox },
            { href: "/week", label: "Week" },
          ]}
        />
        {children}
      </div>
    </div>
  );
}
